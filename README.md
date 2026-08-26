# Global Domination

Crie um jogo online multiplayer de estratégia chamado Conquest Wars, inspirado em jogos de estratégia territorial como Supremacy, Risk e outros jogos de conquista, mas com identidade visual e mecânicas próprias.

O objetivo é criar um MVP realmente jogável, simples o suficiente para desenvolver rapidamente, mas com estrutura que permita adicionar novas funcionalidades depois.

1. CONCEITO DO JOGO

O jogador controla uma nação em um mapa dividido em territórios.

Cada jogador começa com:

1 território inicial

uma pequena quantidade de tropas

dinheiro

recursos

uma base principal

O objetivo é conquistar territórios, administrar recursos, produzir tropas e dominar o mapa.

O jogo deve funcionar online com 2 a 8 jogadores por partida.

2. TELA INICIAL

Criar uma página inicial moderna contendo:

Logo "Conquest Wars"

Botão "Jogar"

Botão "Criar partida"

Botão "Entrar em partida"

Botão "Como jogar"

Perfil do jogador

Lista de partidas disponíveis

Indicador de jogadores online

Visual inspirado em interfaces de jogos de estratégia modernos, sem copiar nenhuma interface existente.

3. SISTEMA DE SALA

Ao clicar em "Criar partida":

Nome da partida

Quantidade máxima de jogadores

Mapa

Modo de jogo

Senha opcional

Botão "Criar"

Ao criar, mostrar um lobby:

jogadores conectados

cor de cada jogador

país/nação escolhida

botão "Pronto"

chat da partida

botão "Iniciar partida"

O criador da sala pode iniciar a partida quando houver pelo menos 2 jogadores.

4. MAPA PRINCIPAL

Criar um mapa estratégico dividido em aproximadamente 30 a 50 territórios.

Cada território deve ser selecionável.

Ao clicar em um território mostrar:

Nome

Dono

Quantidade de tropas

Produção de recursos

Estruturas construídas

Botão "Atacar"

Botão "Mover tropas"

Botão "Construir"

Cada jogador deve possuir uma cor diferente.

O mapa precisa ter aparência de mapa estratégico, com:

fronteiras

regiões

rios

montanhas

cidades

estradas

pequenos elementos decorativos

Priorizar legibilidade.

5. INTERFACE DURANTE A PARTIDA

Criar uma HUD com:

TOPO:

dinheiro

comida

metal

energia

população

quantidade de territórios

tropas totais

LADO ESQUERDO:

informações do território selecionado

LADO DIREITO:

lista de jogadores

posição no ranking

territórios conquistados

pontuação

PARTE INFERIOR:

painel de ações

construir

recrutar

mover tropas

atacar

diplomacia

CANTO INFERIOR:

botão de menu

configurações

sair da partida

6. RECURSOS

Criar um sistema simples de economia.

Recursos:

Dinheiro

Comida

Metal

Energia

Cada território produz uma quantidade diferente de recursos por minuto.

Exemplo:

Território agrícola:
+20 comida/min

Território industrial:
+15 metal/min

Cidade:
+25 dinheiro/min

Região energética:
+15 energia/min

Os recursos devem ser atualizados automaticamente.

7. TROPAS

Criar inicialmente 3 tipos de unidades:

Infantaria

Barata e equilibrada.

Tanque

Mais caro, porém forte no ataque.

Artilharia

Forte contra tropas defensivas, mas cara.

Cada unidade deve possuir:

custo

ataque

defesa

velocidade

manutenção

O jogador pode recrutar unidades através dos territórios.

8. COMBATE

O combate deve ser simples para o MVP.

Quando um jogador atacar um território inimigo:

Seleciona seu território.

Clica em "Atacar".

Seleciona o território inimigo.

Define quantidade de tropas.

Confirma o ataque.

O sistema calcula o combate.

Mostrar uma pequena animação.

Atualizar o território e as tropas.

Utilizar uma fórmula simples considerando:

quantidade de tropas

força das unidades

bônus defensivo do território

estruturas defensivas

Não precisa criar combate em tempo real complexo.

9. CONSTRUÇÕES

Permitir construir:

Quartel

Aumenta produção de infantaria.

Fábrica

Permite produzir tanques.

Oficina

Permite produzir artilharia.

Muralha

Aumenta defesa do território.

Centro econômico

Aumenta produção de dinheiro.

Cada construção possui custo e tempo de construção.

10. MOVIMENTAÇÃO

O jogador pode mover tropas entre territórios aliados conectados.

Exemplo:

Território A → Território B

Selecionar:

origem

destino

quantidade de tropas

Depois clicar em "Mover".

Criar uma pequena animação indicando o deslocamento.

11. DIPLOMACIA

Criar um sistema básico de diplomacia.

Os jogadores podem:

enviar proposta de paz

declarar guerra

formar aliança

cancelar aliança

Mostrar o status diplomático entre jogadores.

12. CHAT

Criar chat dentro da partida.

Possuir:

chat geral

mensagens entre aliados

Mostrar nome e cor do jogador.

13. SISTEMA DE TURNOS / TEMPO

Para o MVP, utilizar tempo contínuo simplificado.

O jogo possui um relógio:

"Dia 12 — 14:32"

Recursos são produzidos automaticamente.

Tropas possuem tempo de deslocamento.

Construções possuem tempo de produção.

Adicionar velocidade da partida:

1x

2x

4x

Se for mais simples tecnicamente, começar apenas com 1x.

14. SISTEMA DE VITÓRIA

Criar três condições possíveis:

Dominação

Conquistar 70% dos territórios.

Pontuação

Alcançar determinada quantidade de pontos.

Eliminação

Eliminar todos os territórios de um jogador.

Ao terminar a partida mostrar:

vencedor

ranking

territórios conquistados

tropas eliminadas

recursos produzidos

duração da partida

15. RANKING

Criar sistema de pontuação.

Depois da partida:

Vitória:
+100 pontos

Segundo lugar:
+60

Terceiro:
+40

Participação:
+10

Criar página de ranking com:

posição

jogador

vitórias

derrotas

partidas

pontos

taxa de vitória

16. PERFIL

Criar perfil do jogador contendo:

avatar

nome

nível

XP

partidas

vitórias

derrotas

ranking

conquistas

Adicionar algumas conquistas:

"Primeira Vitória"

"Conquistador"

"General"

"Dominação Total"

17. BANCO DE DADOS E MULTIPLAYER

Utilizar Supabase para:

autenticação

usuários

partidas

jogadores

territórios

tropas

recursos

construções

diplomacia

chat

ranking

Utilizar atualização em tempo real para que os jogadores vejam as ações uns dos outros.

A estrutura deve ser organizada para permitir partidas simultâneas.

18. AUTENTICAÇÃO

Criar:

cadastro

login

logout

recuperação de senha

Permitir também entrar rapidamente como convidado para testar o MVP, caso seja mais simples.

19. DESIGN

O visual deve parecer um jogo de estratégia de PC.

Utilizar:

interface escura

mapas com aparência militar/estratégica

painéis discretos

ícones simples

tipografia moderna

cores diferentes para cada jogador

animações pequenas

sombras e profundidade

Não exagerar nos efeitos.

A interface deve ser limpa e funcional.

Evitar aparência genérica de dashboard administrativo.

O mapa deve ser o elemento principal da tela.

20. RESPONSIVIDADE

Priorizar desktop.

O jogo deve funcionar em:

1920x1080

1440x900

1366x768

Criar adaptação básica para tablet.

Celular pode possuir uma versão simplificada posteriormente.

21. ESTRUTURA DE TELAS

Criar:

Login

Cadastro

Menu principal

Perfil

Ranking

Lista de partidas

Criar partida

Lobby

Mapa da partida

Diplomacia

Resultado da partida

Configurações

22. MVP

Não tente criar tudo de uma vez.

Primeiro faça funcionar:

Login

Criar partida

Entrar na partida

Lobby

Mapa

Territórios

Jogadores

Recursos

Tropas

Ataque

Conquista de território

Vitória

Multiplayer em tempo real

Depois implemente:

construções

diplomacia

ranking

chat

diferentes unidades

animações

conquistas

23. IMPORTANTE

O jogo precisa ser funcional, não apenas uma interface visual.

Não criar botões falsos.

Quando o usuário clicar em atacar, mover tropas, construir ou recrutar, a ação deve realmente alterar o estado da partida.

Organizar o código de forma modular.

Separar:

componentes

páginas

lógica do jogo

serviços

banco de dados

autenticação

estado da partida

Criar dados iniciais para que seja possível testar o jogo imediatamente.

Se o multiplayer completo exigir etapas adicionais, primeiro implemente uma partida funcional com estado persistido e depois conecte o sistema em tempo real.

O resultado final deve parecer um MVP de um jogo de estratégia online que realmente dá para jogar com amigos, e não apenas uma demonstração de UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://conquer-realms-online.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17cf6826-a914-4c15-a2ed-f23ed8d38e89).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
