'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [setupResult, setSetupResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const setupDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setSetupResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setSetupResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🛠️ 데이터베이스 설정
          </h1>

          <div className="space-y-8">
            {/* 데이터베이스 연결 테스트 */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                1. 데이터베이스 연결 테스트
              </h2>
              <button
                onClick={testDatabase}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {loading ? '테스트 중...' : '연결 테스트'}
              </button>

              {testResult && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">결과:</h3>
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>

            {/* 데이터베이스 스키마 설정 */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                2. 데이터베이스 스키마 설정
              </h2>
              <button
                onClick={setupDatabase}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {loading ? '설정 중...' : '스키마 설정'}
              </button>

              {setupResult && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">결과:</h3>
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                    {setupResult}
                  </pre>
                </div>
              )}
            </div>

            {/* 설명 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-800 mb-2">
                📝 설정 순서
              </h3>
              <ol className="list-decimal list-inside text-blue-700 space-y-1">
                <li>먼저 "연결 테스트"를 클릭하여 데이터베이스 연결을 확인하세요</li>
                <li>연결이 성공하면 "스키마 설정"을 클릭하여 테이블을 생성하세요</li>
                <li>모든 설정이 완료되면 메인 애플리케이션을 사용할 수 있습니다</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}