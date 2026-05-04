import questionsData from '../data/questions.json';
import type { QuestionsData, Block, Question } from '../types/types';

export const DATA = questionsData as unknown as QuestionsData;
export const QUESTIONS: Question[] = DATA.questions;
export const BLOCKS: Block[] = DATA.blocks;

const BLOCK_BY_ID = new Map<number, Block>(BLOCKS.map((b) => [b.id, b]));

export function getBlock(id: number): Block | undefined {
  return BLOCK_BY_ID.get(id);
}

export function questionsByBlock(blockId: number): Question[] {
  return QUESTIONS.filter((q) => q.blockId === blockId);
}

export function questionById(id: number): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
