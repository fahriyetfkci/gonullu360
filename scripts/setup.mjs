import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} başarısız. ${result.error?.message || ''}`);
}
try {
  for (const folder of ['backend', 'frontend']) {
    const target = `${folder}/.env`;
    if (!existsSync(target)) {
      let content = readFileSync(`${folder}/.env.example`, 'utf8');
      if (folder === 'backend') {
        for (const key of ['JWT_ACCESS_SECRET', 'CSRF_SECRET', 'COOKIE_SECRET']) {
          content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${randomBytes(32).toString('hex')}`);
        }
        content = content.replace(/^SEED_ADMIN_PASSWORD=.*$/m, `SEED_ADMIN_PASSWORD=Local!${randomBytes(12).toString('hex')}`);
      }
      writeFileSync(target, content, { flag: 'wx' });
      console.log(`${target} oluşturuldu.`);
    }
  }
  if (!process.argv.includes('--skip-install')) {
    run('npm', ['ci'], `${root}/backend`);
    run('npm', ['ci'], `${root}/frontend`);
  }
  run('docker', ['compose', 'up', '-d', '--wait']);
  run('npm', ['run', 'db:generate'], `${root}/backend`);
  run('npm', ['run', 'db:migrate:prod'], `${root}/backend`);
  run('npm', ['run', 'db:seed'], `${root}/backend`);
  console.log('Kurulum tamamlandı. npm run dev ile başlatın. Yönetici bilgileri: backend/.env içindeki SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
