import { vi, describe, it, expect } from 'vitest';

// Mock completo do módulo Input
vi.mock('../src/types/workflow/Input', () => {
  return {
    // Exportações necessárias para o teste
    InputSource: {
      DataObject: 'DataObject',
      LastStep: 'LastStep',
      Global: 'Global',
      UserInput: 'UserInput',
      LastStepAndUserInput: 'LastStepAndUserInput',
    },
    getUserInput: vi.fn().mockImplementation(async () => {
      console.log('Mock getUserInput foi chamado');
      return {
        firstNumber: { value: 2 },
        secondNumber: { value: 3 },
      };
    }),
    // Outras funções que podem ser necessárias para evitar erros
    getStepInput: vi.fn(() => Promise.resolve({})),
    validateUserInput: vi.fn(() => Promise.resolve(true)),
  };
});

import { getUserInput } from '../src/types/workflow/Input';

describe('getUserInput Mock Test', () => {
  it('should mock getUserInput correctly', async () => {
    // Chama a função mockada diretamente
    const result = await getUserInput();

    console.log('Resultado do mock:', result);

    // Verificações
    expect(getUserInput).toHaveBeenCalled();
    expect(result).toEqual({
      firstNumber: { value: 2 },
      secondNumber: { value: 3 },
    });
  });

  it('should allow changing mock implementation', async () => {
    // Altera a implementação do mock para este teste
    vi.mocked(getUserInput).mockImplementationOnce(async () => ({
      customField: { value: 42 },
    }));

    const result = await getUserInput();

    console.log('Resultado do mock customizado:', result);

    expect(result).toEqual({
      customField: { value: 42 },
    });
  });
});
