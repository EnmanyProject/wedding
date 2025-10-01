'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [setupResult, setSetupResult] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  const testDatabase = async () => {
    console.log('Testing database connection...');
    setTestLoading(true);
    setTestResult('');
    try {
      const response = await fetch('/api/test-db?x-vercel-protection-bypass=a7f9k2m8p3q6r1s5t9w4x7z2b6c8d5e1');
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Test error:', error);
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setTestLoading(false);
  };

  const setupDatabase = async () => {
    console.log('Setting up database schema...');
    setSetupLoading(true);
    setSetupResult('');
    try {
      const response = await fetch('/api/setup-db?x-vercel-protection-bypass=a7f9k2m8p3q6r1s5t9w4x7z2b6c8d5e1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Setup response status:', response.status);
      const data = await response.json();
      console.log('Setup response data:', data);
      setSetupResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Setup error:', error);
      setSetupResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setSetupLoading(false);
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
                disabled={testLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {testLoading ? '테스트 중...' : '연결 테스트'}
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
                disabled={setupLoading}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {setupLoading ? '설정 중...' : '스키마 설정'}
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