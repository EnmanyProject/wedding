'use client'

import { useEffect, useState } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="app-header bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <h1 className="app-title text-lg font-semibold">웨딩 앱</h1>
          <div className="header-stats flex items-center gap-2">
            <div className="points-display bg-white/20 rounded-full px-3 py-1 text-xs">
              <span>💎 0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content p-4 space-y-4">
        {/* Welcome Section */}
        <section className="welcome-section text-center">
          <h2 className="text-xl font-semibold mb-2">환영합니다!</h2>
          <p className="text-gray-600 text-sm">퀴즈를 통해 새로운 사람들과 만나보세요</p>
        </section>

        {/* Quiz Suggestion Card */}
        <section className="quiz-suggestion-card card">
          <h3 className="text-base font-semibold mb-3">오늘의 퀴즈</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-4xl mb-2">🎮</div>
            <p className="text-sm text-gray-600 mb-3">새로운 퀴즈가 준비되었습니다</p>
            <button className="btn btn-primary w-full">
              퀴즈 시작하기
            </button>
          </div>
        </section>

        {/* User Avatars Section */}
        <section className="user-avatars-section card">
          <h3 className="text-base font-semibold mb-3">참여자들</h3>
          <div className="user-avatars-grid grid grid-cols-5 gap-3">
            {/* Placeholder avatars */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="user-avatar-card bg-gray-50 rounded-lg p-2 text-center">
                <div className="avatar-image w-8 h-8 bg-gray-300 rounded-full mx-auto mb-1 flex items-center justify-center text-xs">
                  👤
                </div>
                <div className="user-avatar-name text-xs text-gray-600">User{i + 1}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Rankings Section */}
        <section className="rankings-section card">
          <h3 className="text-base font-semibold mb-3">랭킹</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🏆</div>
            <p className="text-sm text-gray-600">아직 랭킹 데이터가 없습니다</p>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-app w-full bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          <button className="nav-item flex flex-col items-center gap-1 px-3 py-1 rounded-md bg-primary-50 text-primary-600">
            <span className="nav-icon text-sm">🏠</span>
            <span className="nav-label text-xs">홈</span>
          </button>
          <button className="nav-item flex flex-col items-center gap-1 px-3 py-1 rounded-md text-gray-500">
            <span className="nav-icon text-sm">🎮</span>
            <span className="nav-label text-xs">퀴즈</span>
          </button>
          <button className="nav-item flex flex-col items-center gap-1 px-3 py-1 rounded-md text-gray-500">
            <span className="nav-icon text-sm">📷</span>
            <span className="nav-label text-xs">사진</span>
          </button>
          <button className="nav-item flex flex-col items-center gap-1 px-3 py-1 rounded-md text-gray-500">
            <span className="nav-icon text-sm">👥</span>
            <span className="nav-label text-xs">매칭</span>
          </button>
        </div>
      </nav>
    </div>
  )
}