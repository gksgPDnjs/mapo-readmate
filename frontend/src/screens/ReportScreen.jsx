function ReportScreen({ onRestart }) {
  return (
    <div className="screen">
      <h2>AI 독서 리포트</h2>
      <p>리포트 요약 + QR 코드 (준비 중)</p>
      <button onClick={onRestart}>처음으로</button>
    </div>
  )
}

export default ReportScreen
