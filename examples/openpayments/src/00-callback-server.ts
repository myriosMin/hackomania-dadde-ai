import http from 'node:http'

const port = Number(process.env.CALLBACK_PORT ?? 3344)

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  const interactRef = url.searchParams.get('interact_ref')

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('You can return to the terminal.\n')

  console.log('Callback received at', new Date().toISOString())
  console.log('Full URL:', url.toString())
  console.log('interact_ref:', interactRef ?? '<missing>')
})

server.listen(port, () => {
  console.log(`Listening for Open Payments redirect at http://localhost:${port}/callback`)
})
