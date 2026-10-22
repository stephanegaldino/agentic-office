// Nome do fork. O código, os dicionários e as chaves do tr() continuam dizendo "Habblaud" (igual ao projeto
// original, para o merge com ele não brigar); o nome visível é trocado aqui, na saída do tr() e nos poucos
// textos que ficam fora dele (HTML, notificação, placa, logotipo, plugins).
export const BRAND = 'Agentic Office';

/** Palavra inteira "Habblaud" (H maiúsculo), exceto quando é o "Habblaud World" (o serviço online do autor original). */
const NAME = /\bHabblaud\b(?! World\b)/g;

/** Troca o nome do produto num texto já traduzido. Identificadores (habblaud, HABBLAUD_, habblaud.com) não casam. */
export function brand(text: string): string {
  return text.replace(NAME, BRAND);
}
