import { DeployError } from '../../../../src/errors.js';

export default [
  {
    title: 'Clean failure',
    async run() {
      throw new DeployError('token rejected');
    },
  },
];
