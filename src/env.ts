try {
  process.loadEnvFile()
} catch {
  console.warn('.env 파일을 찾지 못했습니다. .env.example을 복사해서 .env를 만들어주세요.')
}
