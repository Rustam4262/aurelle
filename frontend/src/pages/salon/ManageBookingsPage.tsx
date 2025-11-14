import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ManageBookingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/salon/dashboard" className="flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад
          </Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Управление записями</h1>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Записей пока нет</p>
        </div>
      </div>
    </div>
  )
}
