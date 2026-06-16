import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sparkles, List, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Starfield } from './Starfield';

const navItems = [
  { path: '/', label: 'Queue', icon: List },
  { path: '/stats', label: 'My Stats', icon: BarChart3 },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen starfield flex flex-col relative">
      <Starfield />
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#08061E]/80 border-b border-[#83828D]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Sparkles className="w-7 h-7 text-[#F4EBB9] group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute inset-0 bg-[#F4EBB9]/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight text-white">
                Stardance <span className="gradient-text">Community</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#83828D] font-bold">
                Shipwright Dash
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200
                    ${active
                      ? 'bg-[#F4EBB9] text-[#08061E]'
                      : 'text-[#AFB2C1] hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#343651] border border-[#83828D]/30">
              <div className="w-2 h-2 rounded-full bg-[#81FFFF] animate-pulse" />
              <span className="text-xs font-bold text-[#AFB2C1]">Session active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
