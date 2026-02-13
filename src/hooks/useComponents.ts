import { useState, useEffect, useCallback } from 'react';
import { ElectronicComponent } from '@/types/component';

const STORAGE_KEY = 'electronic-components';

function loadComponents(): ElectronicComponent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveComponents(components: ElectronicComponent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
}

export function useComponents() {
  const [components, setComponents] = useState<ElectronicComponent[]>(loadComponents);

  useEffect(() => {
    saveComponents(components);
  }, [components]);

  const addComponent = useCallback((component: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newComponent: ElectronicComponent = {
      ...component,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setComponents(prev => [newComponent, ...prev]);
    return newComponent;
  }, []);

  const updateComponent = useCallback((id: string, updates: Partial<ElectronicComponent>) => {
    setComponents(prev =>
      prev.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    );
  }, []);

  const deleteComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
  }, []);

  return { components, addComponent, updateComponent, deleteComponent };
}
