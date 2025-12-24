import { Link } from 'react-router-dom'
import { Search, Calendar, Star, MapPin, Sparkles, ArrowRight, Check, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-pink-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img src="/logo.png" alt="AURELLE" className="h-10 w-auto transition-transform group-hover:scale-110" />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary-400 animate-pulse" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              AURELLE
            </span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link 
              to="/login" 
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="bg-gradient-to-r from-primary-600 to-pink-500 text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              Регистрация
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <div className="mb-8 flex justify-center animate-fadeInUp">
            <div className="relative">
              <img src="/logo.png" alt="AURELLE" className="h-28 w-auto drop-shadow-2xl" />
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-400 to-purple-400 rounded-full opacity-20 blur-2xl animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 animate-fadeInUp animation-delay-200">
            <span className="bg-gradient-to-r from-primary-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              AURELLE
            </span>
            <br />
            <span className="text-gray-800 text-4xl md:text-5xl lg:text-6xl">
              Запись в салоны красоты онлайн
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed animate-fadeInUp animation-delay-400">
            Найдите лучшие салоны рядом с вами. Сравните цены, выберите мастера и запишитесь онлайн
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fadeInUp animation-delay-600">
            <Link
              to="/register"
              className="group relative bg-gradient-to-r from-primary-600 to-pink-500 text-white px-10 py-5 rounded-full text-lg font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 overflow-hidden"
            >
              <span className="relative z-10">Начать сейчас</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            <Link
              to="/login"
              className="bg-white text-primary-600 border-2 border-primary-600 px-10 py-5 rounded-full text-lg font-semibold hover:bg-primary-50 hover:border-primary-700 transition-all duration-300"
            >
              У меня уже есть аккаунт
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fadeInUp animation-delay-800">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary-600">100+</div>
              <div className="text-sm md:text-base text-gray-600 mt-2">Салонов</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-600">500+</div>
              <div className="text-sm md:text-base text-gray-600 mt-2">Мастеров</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600">1000+</div>
              <div className="text-sm md:text-base text-gray-600 mt-2">Записей</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Почему выбирают <span className="text-primary-600">AURELLE</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Все что нужно для комфортной записи в салон красоты
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Search,
              title: "Поиск салонов",
              description: "Найдите салон по услугам, цене и рейтингу",
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50"
            },
            {
              icon: Calendar,
              title: "Онлайн запись",
              description: "Выберите удобное время и запишитесь за минуту",
              gradient: "from-pink-500 to-rose-500",
              bgGradient: "from-pink-50 to-rose-50"
            },
            {
              icon: Star,
              title: "Рейтинги и отзывы",
              description: "Читайте отзывы других клиентов",
              gradient: "from-yellow-500 to-orange-500",
              bgGradient: "from-yellow-50 to-orange-50"
            },
            {
              icon: MapPin,
              title: "Рядом с вами",
              description: "Найдите салоны в вашем районе",
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}></div>
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Как это работает
            </h2>
            <p className="text-xl text-gray-600">Всего 3 простых шага</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Найдите салон", description: "Выберите салон из списка или найдите по карте" },
              { step: "2", title: "Выберите услугу", description: "Просмотрите услуги и выберите мастера" },
              { step: "3", title: "Запишитесь онлайн", description: "Выберите удобное время и подтвердите запись" }
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary-600 to-pink-500 text-white text-2xl font-bold mb-6 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full">
                    <ArrowRight className="w-8 h-8 text-primary-300 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA для салонов */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-pink-600 to-purple-600"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Users className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Вы владелец салона?
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
            Присоединяйтесь к платформе и получайте новых клиентов каждый день
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              "Бесплатная регистрация",
              "Управление расписанием",
              "Онлайн бронирования",
              "Статистика и аналитика"
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Check className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{benefit}</span>
              </div>
            ))}
          </div>
          <Link
            to="/register?type=salon"
            className="inline-flex items-center gap-3 bg-white text-primary-600 px-10 py-5 rounded-full text-lg font-bold hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-2xl"
          >
            Зарегистрировать салон
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/logo.png" alt="AURELLE" className="h-8 w-auto" />
                <span className="text-xl font-bold">AURELLE</span>
              </div>
              <p className="text-gray-400">
                Платформа для записи в салоны красоты онлайн
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Для клиентов</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/register" className="hover:text-white transition-colors">Регистрация</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Вход</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Для салонов</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/register?type=salon" className="hover:text-white transition-colors">Регистрация салона</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Контакты</h4>
              <p className="text-gray-400">support@aurelle.uz</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AURELLE. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
