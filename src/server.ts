import './env.js'
import express from 'express'
import cors from 'cors'
import { foundryClient, CHAT_MODEL_NAME } from './ai/foundryClient.js'

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/ai/chat', async (req, res) => {
  const { input } = req.body ?? {}

  if (typeof input !== 'string' || !input.trim()) {
    res.status(400).json({ error: 'input(string)이 필요합니다.' })
    return
  }

  try {
    const response = await foundryClient.responses.create({
      model: CHAT_MODEL_NAME,
      input,
      max_output_tokens: 512,
    })
    res.json({ text: response.output_text })
  } catch (error) {
    console.error('AI 호출 실패:', error)
    res.status(502).json({ error: 'AI 호출에 실패했습니다.' })
  }
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787
app.listen(PORT, () => {
  console.log(`AI proxy server listening on http://localhost:${PORT}`)
})
