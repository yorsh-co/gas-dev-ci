// @ts-check

/** @type {import('../../../../types.d.ts').DeployStep[]} */
export default [
  {
    title: 'Ask',
    async run(ctx) {
      await ctx.prompt({ type: 'text', name: 'x', message: 'x' });
    },
  },
];
