import type { MockInstance } from 'vitest';

import logger from '@src/common/utils/logger';
import { startServer, shutdown } from '@src/main';
import db from '@src/config/db';
import redis from '@src/config/redis';
import server from '@src/server';

// Spy on the real config modules so no live connections are made.
// Hoisted so the vi.mock factories can reference them.
const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(() =>
    Promise.resolve({ rows: [] as unknown[], rowCount: 0 }),
  ),
}));

vi.mock('@src/config/db', () => ({
  default: {
    pool: { query: queryMock },
    connectDb: vi.fn(),
    closeDb: vi.fn(),
  },
}));

vi.mock('@src/config/redis', () => ({
  default: {
    client: { on: vi.fn() },
    connectRedis: vi.fn(),
    closeRedis: vi.fn(),
  },
}));

// ========================================================================= //
//                                   TESTS                                   //
// ========================================================================= //

describe('Server startup', () => {
  let listenSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    listenSpy = vi
      .spyOn(server, 'listen')
      .mockImplementation((() => server) as never);
    vi.spyOn(logger, 'imp').mockImplementation(() => undefined);
    vi.spyOn(logger, 'err').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should connect to the database and redis, then start listening.', async () => {
    const adminRow = {
      rows: [
        {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Admin',
          email: 'admin@test.local',
          password_hash: 'hash',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
      ],
      rowCount: 1,
    };
    const empty = { rows: [], rowCount: 0 };
    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce(empty) // migrations
      .mockResolvedValueOnce(empty) // admin lookup by email
      .mockResolvedValueOnce(adminRow); // admin insert
    const order: string[] = [];
    vi.mocked(db.connectDb).mockImplementation(() => {
      order.push('db');
      return Promise.resolve();
    });
    vi.mocked(redis.connectRedis).mockImplementation(() => {
      order.push('redis');
      return Promise.resolve();
    });
    vi.spyOn(server, 'listen').mockImplementation(((...args: unknown[]) => {
      order.push('listen');
      const cb = args.find((arg) => typeof arg === 'function') as
        | ((err?: Error) => void)
        | undefined;
      cb?.();
      return server;
    }) as never);

    await startServer();

    expect(order).toStrictEqual(['db', 'redis', 'listen']);
    expect(logger.imp).toHaveBeenCalledWith(
      'Express server started on port: ' + 4000,
    );
  });

  it('should fail startup when the database is unreachable.', async () => {
    vi.mocked(db.connectDb).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(startServer()).rejects.toThrow('ECONNREFUSED');
    expect(logger.err).toHaveBeenCalledWith(
      'Database connection failed:',
      expect.objectContaining({ message: 'ECONNREFUSED' }),
    );
    expect(redis.connectRedis).not.toHaveBeenCalled();
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('should fail startup when redis is unreachable.', async () => {
    vi.mocked(redis.connectRedis).mockRejectedValueOnce(
      new Error('Redis is unreachable'),
    );

    await expect(startServer()).rejects.toThrow('Redis is unreachable');
    expect(logger.err).toHaveBeenCalledWith(
      'Redis connection failed:',
      expect.objectContaining({ message: 'Redis is unreachable' }),
    );
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('should close redis and the database pool on shutdown.', async () => {
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await shutdown(0);

    expect(redis.closeRedis).toHaveBeenCalledTimes(1);
    expect(db.closeDb).toHaveBeenCalledTimes(1);
  });

  it('should log but still exit if closing a connection fails.', async () => {
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.mocked(redis.closeRedis).mockRejectedValueOnce(new Error('already closed'));

    await shutdown(0);

    expect(logger.err).toHaveBeenCalledWith(
      'Error while closing Redis:',
      expect.objectContaining({ message: 'already closed' }),
    );
    expect(db.closeDb).toHaveBeenCalled();
  });
});
