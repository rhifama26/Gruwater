import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  const getRoleLabel = (role) => {
    return role === 'admin' ? 'Administrator' : 'Pembudidaya';
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-3.5 flex items-center justify-between">
      <div>
        <h2 className="text-base font-bold text-slate-800">
          Selamat datang, <span className="text-primary-600">{user?.username}</span>
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {getRoleLabel(user?.role)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-700">{user?.username}</p>
          <p className="text-[11px] text-slate-400">{user?.email}</p>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
