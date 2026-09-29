import 'dotenv/config';
import path from 'node:path';
import { cleanupExpiredExtractions } from '../extractionJobs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const retentionArg = args.find(argument => argument.startsWith('--older-than-days='));
const retentionDays = retentionArg ? Number(retentionArg.split('=')[1]) : 30;
const unknownArgs = args.filter(argument => argument !== '--apply' && argument !== retentionArg);
if (unknownArgs.length || !Number.isInteger(retentionDays) || retentionDays < 1) {
  console.error('Uso: npm run cleanup:extraction [-- --older-than-days=30] [--apply]');
  process.exitCode = 2;
} else {
  const directory = path.resolve(process.env.EXTRACTION_STATE_DIR || '.extraction-state');
  const report = cleanupExpiredExtractions(directory, retentionDays, apply);
  console.log(`${apply ? 'Limpeza aplicada' : 'Simulação'} em ${directory}`);
  console.log(`Jobs examinados: ${report.examined}; expirados: ${report.expired}; ativos preservados: ${report.skippedActive}; removidos: ${report.deleted}.`);
  if (!apply && report.expired > 0) console.log('Revise o resultado e passe --apply para remover documentos, checkpoints e resultados expirados.');
}
