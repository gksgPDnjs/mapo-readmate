import Button from '../components/Button'
import './DatabaseSetupScreen.css'

const sources = [
  {
    name: '도서관정보나루',
    variables: 'DATA4LIBRARY_API_KEY',
    url: 'https://www.data4library.kr/apiUtilization',
    note: '도서관 소장·대출 데이터',
  },
  {
    name: '국립중앙도서관',
    variables: 'NATIONAL_LIBRARY_API_SEARCH_URL, NATIONAL_LIBRARY_API_KEY',
    url: 'https://www.nl.go.kr/NL/contents/N31101030500.do',
    note: '서지 검색 API 발급 URL 템플릿',
  },
  {
    name: '알라딘 TTB',
    variables: 'ALADIN_TTB_KEY',
    url: 'https://www.aladin.co.kr/ttb/wblog_manage.aspx',
    note: '판본·표지 보조 데이터',
  },
  {
    name: 'Google Books',
    variables: 'GOOGLE_BOOKS_API_KEY',
    url: 'https://console.cloud.google.com/apis/library/books.googleapis.com',
    note: '국제 메타데이터 보강',
  },
]

function DatabaseSetupScreen({ onClose, onOpenTest }) {
  return (
    <main className="database-setup screen">
      <header className="database-setup-header">
        <span className="database-setup-kicker">운영자 도구</span>
        <h1>도서 데이터 소스</h1>
        <p>키는 서버의 루트 <code>.env</code>에만 설정됩니다.</p>
      </header>

      <section className="source-list" aria-label="외부 도서 데이터 소스">
        {sources.map((source) => (
          <article className="source-item" key={source.name}>
            <div>
              <h2>{source.name}</h2>
              <p>{source.note}</p>
            </div>
            <code>{source.variables}</code>
            <a href={source.url} target="_blank" rel="noreferrer">
              발급 페이지 열기
            </a>
          </article>
        ))}
      </section>

      <section className="setup-check" aria-label="연결 검사 명령">
        <span>연결 검사</span>
        <code>npm run integrations:check</code>
        <p>모든 소스가 ready로 표시되면 수집 준비가 완료됩니다.</p>
      </section>

      <div className="screen-actions">
        <Button onClick={onClose}>체험 화면으로 돌아가기</Button>
        <Button variant="secondary" onClick={onOpenTest}>DB 연결 테스트</Button>
      </div>
    </main>
  )
}

export default DatabaseSetupScreen