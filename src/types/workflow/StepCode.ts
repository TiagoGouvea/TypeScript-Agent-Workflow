import { error } from '../../utils/log.ts';

export const executeCodeStep = async ({
  step,
  stepInput,
}: {
  step: any;
  stepInput: any;
}) => {
  try {
    return await step.run({ step, stepInput });
  } catch (err: any) {
    error('Error calling the model:', err.message || err);
    process.exit(1);
  }
};
