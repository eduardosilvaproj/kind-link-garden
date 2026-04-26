import { useState, useEffect } from 'react';
import { Transacao, Config, Titular, AutoRule } from '../types';
import { DEFAULT_CONFIG } from '../data/defaultConfig';

export const useAppContext = () => {
  const [config, setConfig] = useState<Config>(() => {
    const saved = localStorage.getItem('c6_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [transacoes, setTransacoes] = useState<Transacao[]>(() => {
    const saved = localStorage.getItem('c6_transacoes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('c6_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('c6_transacoes', JSON.stringify(transacoes));
  }, [transacoes]);

  const updateTransacao = (id: number, updates: Partial<Transacao>) => {
    setTransacoes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const updateConfig = (newConfig: Config) => {
    setConfig(newConfig);
  };

  const clearData = () => {
    setTransacoes([]);
  };

  return {
    config,
    transacoes,
    setTransacoes,
    updateTransacao,
    updateConfig,
    clearData
  };
};