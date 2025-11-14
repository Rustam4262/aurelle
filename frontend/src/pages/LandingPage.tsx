import { Link } from 'react-router-dom'
import { Search, Calendar, Star, MapPin } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">Beauty Salon</div>
          <div className="space-x-4">
            <Link to="/login" className="text-gray-700 hover:text-primary-600">
              Войти
            </Link>
            <Link
              to="/register"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Регистрация
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Запись в салоны красоты онлайн
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Найдите лучшие салоны рядом с вами. Сравните цены, выберите мастера и запишитесь онлайн
        </p>
        <Link
          to="/register"
          className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 inline-block"
        >
          Начать сейчас
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Поиск салонов</h3>
            <p className="text-gray-600">Найдите салон по услугам, цене и рейтингу</p>
          </div>

          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Онлайн запись</h3>
            <p className="text-gray-600">Выберите удобное время и запишитесь за минуту</p>
          </div>

          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Рейтинги и отзывы</h3>
            <p className="text-gray-600">Читайте отзывы других клиентов</p>
          </div>

          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Рядом с вами</h3>
            <p className="text-gray-600">Найдите салоны в вашем районе</p>
          </div>
        </div>
      </section>

      {/* CTA для салонов */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Вы владелец салона?</h2>
          <p className="text-xl mb-8">
            Присоединяйтесь к платформе и получайте новых клиентов каждый день
          </p>
          <Link
            to="/register?type=salon"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 inline-block"
          >
            Зарегистрировать салон
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Beauty Salon Marketplace. Все права защищены.</p>
        </div>
      </footer>
    </div>
  )
}
