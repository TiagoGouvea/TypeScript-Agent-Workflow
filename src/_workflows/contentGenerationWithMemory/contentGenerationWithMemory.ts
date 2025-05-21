// Steps
// 1 - Ask about the subjects
// Read the file with previous posts
// Suggest new posts and discuss the ideias
// Create the posts

// Todo
// @todo Ter várias estratégias, node if

import { z } from 'zod';
import { InputSource } from '../../types/workflow/Input.ts';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { AgentNode } from '../../nodes/Agent.ts';

const firsStepInOutSchema = z.object({
  subject: z.string().describe('What main topic do you want to write about?'),
  public: z.string().describe('What the public that will read the news?'),
  objective: z
    .string()
    .describe(
      'What`s the objective of the content (subjective or not)? Ex: show authority, suggest a solution...',
    ),
  contentType: z
    .string()
    .describe(
      'What type of content do you want to generate? Ex: blog post, linkedIn posts, article...',
    ),
  quantity: z.string().describe('How many posts do you want to generate?'),
  language: z
    .string()
    .describe(
      'What languages do you want to use on the contents? Ex: English, Portuguese...',
    ),
});

const understandSubject = new AgentNode({
  introductionText: 'I will create some content for you',
  inputSource: InputSource.UserInput,
  inputSchema: firsStepInOutSchema,
  outputSchema: firsStepInOutSchema,
  systemPrompt: `
    Você entende a demanda do usuário para a elaboração de uma série de conteúdos, de acordo com o assunto, objetivo final e demais parâmetros.

    Se alguma das informações não for suficiente para a criação dos conteúdos, pergunte ao usuário para obter mais informação.
  `,
});

const discussStrategy = new AgentNode({
  introductionText: 'I will help create the post strategy',
  inputSource: InputSource.LastStepAndUserInput,
  inputSchema: firsStepInOutSchema,
  outputSchema: z.object({
    contentBriefSchema: z.array(
      z.object({
        postTitle: z.string().describe('Titulo do post'),
        postTopics: z.string().describe('Tópicos e objetivo de cada tópico'),
        objective: z
          .string()
          .describe(
            'Objetivo principal do post. Ex: educar, vender, engajar, provocar.',
          ),
        topic: z
          .string()
          .describe('Tema central ou assunto principal do post.'),
        audience: z
          .string()
          .describe(
            'Público-alvo. Ex: donos de pequenas empresas, desenvolvedores, profissionais de marketing.',
          ),
        mainMessage: z
          .string()
          .describe(
            'Mensagem principal que o leitor deve absorver após a leitura.',
          ),
        keyPoints: z
          .array(z.string())
          .describe(
            'Lista de ideias, argumentos ou exemplos importantes que devem estar no post.',
          ),
        tone: z
          .string()
          .describe(
            'Tom de voz desejado. Ex: técnico, informal, inspirador, descontraído.',
          ),
        callToAction: z
          .string()
          .optional()
          .describe(
            'Chamada para ação opcional. Ex: comente, clique no link, envie mensagem.',
          ),
        format: z
          .string()
          .describe(
            'Formato e tamanho esperado. Ex: Reels (máx. 500 caracteres), carrossel no Instagram, artigo no LinkedIn.',
          ),
      }),
    ),
  }),
  systemPrompt: `
    # Discussão
    
    Você discute com o usuário sobre a estratégia de criação dos conteúdos, de acordo com os parametros recebidos, para elaborar 
    
    Focar em SEO nos títulos e nos subtítulos, para capturar buscas no Google.
    Incluir ao menos 4 subtítulos em cada post.
    
    Pergunte se os esboços estão ok, se tem algo a ser ajustado, ou se pode seguir para o próximo passo.
    
    Apresente o post para a aprovação seguindo o exemplo abaixo, pergunte se ficou como esperado, e vá realizando as alterações solicitadas, até que ele aceite todos os post.
    
    " 
    # Titulo do Post
    ## Subtítulo 1
    Frase definindo o que será tratado neste subtítulo.
    ## Subtítulo 2
    Frase definindo o que será tratado neste subtítulo.
    "

    Não Escrever Cada Palavra Com a Primeira Letra Maiúscula. Escrever da forma normal, usando maiúsculas só na primeira palavra da frase ou em siglas.
    
    Quando ele aceitar a proposta, deixe o workflow ir para a próxima etapa.
    
    # Exemplos de possíveis objetivos subjetivos
    - Posicionar-se como especialista: Usando histórias e exemplos para se posicionar como referência no assunto, sugerindo que entende o mercado e as dificuldades enfrentadas pelos leitores.
    - Educar o leitor para tomar decisões conscientes: Ao compartilhar lições aprendidas, o texto conduz o leitor a pensar criticamente e a evitar armadilhas comuns, mesmo que isso não seja explicitamente o foco principal.
    - Promover valores relacionados à colaboração e aprendizado: Influenciar a mentalidade do leitor para valorizar equipes diversificadas, compartilhamento de conhecimento, metodologias sólidas e o aprendizado constante.
    - Refletir sobre a importância de entender o processo: Não se trata apenas de fazer, mas entender a razão e entender que é uma jornada.
  `,
});

const workflow = new Workflow({
  understandSubject,
  discussStrategy,
});
await workflow.execute();

console.log('-----------------------');
console.log('The final result!');
console.log(workflow.getResult('rawData'));
