import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redisClient', () => {
  it('checks the return of .isAlive()', () => {
    expect(redisClient.isAlive()).to.equal(true);
  });

  it('checks the return of .get()', (done) => {
    (async () => {
      expect(await redisClient.get('randomKey1')).to.equal(null);
      await redisClient.set('Holberton', 'School', 1);
      const value = await redisClient.get('Holberton');
      expect(value).to.equal('School');

      setTimeout(async () => {
        expect(await redisClient.get('Holberton')).to.equal(null);
        done();
      }, 1000 * 1.01);
    })();
  });

  it('checks the return of .set()', (done) => {
    (async () => {
      expect(await redisClient.get('randomKey1')).to.equal(null);
      await redisClient.set('Holberton', 'School', 3);
      const value = await redisClient.get('Holberton');
      expect(value).to.equal('School');

      setTimeout(async () => {
        expect(await redisClient.get('Holberton')).to.equal(null);
        done();
      }, 1000 * 3.01);
    })();
  }).timeout(11000);

  it('checks the return of .del()', async () => {
    await redisClient.set('Holberton', 'School', 5);
    await redisClient.del('Holberton');
    expect(await redisClient.get('Holberton')).to.equal(null);
  });
});
