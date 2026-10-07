import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FiArrowLeft, FiHome } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n';

export default function NotFound() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const home = !user ? '/login' : user.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <main className="not-found">
      <motion.div
        className="card not-found-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <img src="/favicon.svg" alt="" width="56" height="56" className="not-found-logo" />
        <div className="not-found-code" aria-hidden="true">404</div>
        <h1 className="not-found-title">{t('notFound.title')}</h1>
        <p className="not-found-body">{t('notFound.body')}</p>
        <div className="not-found-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            <FiArrowLeft aria-hidden="true" /> {t('notFound.back')}
          </button>
          <Link to={home} className="btn btn-primary">
            <FiHome aria-hidden="true" /> {user ? t('notFound.home') : t('notFound.login')}
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
