import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DocsPage() {
  // 1. 파일 경로 설정 (프로젝트 루트의 파일을 읽어옵니다)
  const overviewPath = path.join(process.cwd(), 'PROJECT_OVERVIEW.md');
  const historyPath = path.join(process.cwd(), 'HISTORY.md');

  // 2. 파일 내용 읽기
  const overviewContent = fs.existsSync(overviewPath) 
    ? fs.readFileSync(overviewPath, 'utf8') 
    : '개요 파일이 없습니다.';
  const historyContent = fs.existsSync(historyPath) 
    ? fs.readFileSync(historyPath, 'utf8') 
    : '업데이트 이력 파일이 없습니다.';

  return (
    // 전체 컨테이너 너비를 max-w-4xl에서 3xl로 줄여 가독성을 높였습니다.
    <div className="container mx-auto py-10 px-4 max-w-3xl space-y-12">
      
      {/* 프로젝트 개요 섹션 */}
      {/* lg:prose-xl를 제거하고 prose-sm(모바일) sm:prose-base(데스크탑)를 적용했습니다 */}
      <section className="prose prose-slate max-w-none bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 prose-sm sm:prose-base">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {overviewContent}
        </ReactMarkdown>
      </section>

      <hr className="border-slate-100" />

      {/* 업데이트 이력 섹션 */}
      <section className="prose prose-slate max-w-none bg-blue-50/30 p-6 sm:p-8 rounded-2xl shadow-sm border border-blue-100 prose-sm sm:prose-base">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {historyContent}
        </ReactMarkdown>
      </section>
      
    </div>
  );
}