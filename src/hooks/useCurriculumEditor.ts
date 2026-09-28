import React, { useState } from 'react';
import { CurriculumSubject } from '../types';

export interface UseCurriculumEditorParams {
  curriculumSubjects: CurriculumSubject[];
  setCurriculumSubjects: React.Dispatch<React.SetStateAction<CurriculumSubject[]>>;
  filterProfile: string;
}

export interface UseCurriculumEditorReturn {
  editingCurrIndex: number | null;
  setEditingCurrIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editCurrCode: string;
  setEditCurrCode: React.Dispatch<React.SetStateAction<string>>;
  editCurrName: string;
  setEditCurrName: React.Dispatch<React.SetStateAction<string>>;
  editCurrType: string;
  setEditCurrType: React.Dispatch<React.SetStateAction<string>>;
  editCurrPeriod: string;
  setEditCurrPeriod: React.Dispatch<React.SetStateAction<string>>;
  editCurrProfile: string;
  setEditCurrProfile: React.Dispatch<React.SetStateAction<string>>;
  editCurrCredits: number | '';
  setEditCurrCredits: React.Dispatch<React.SetStateAction<number | ''>>;
  editCurrTeorica: number | '';
  setEditCurrTeorica: React.Dispatch<React.SetStateAction<number | ''>>;
  editCurrPratica: number | '';
  setEditCurrPratica: React.Dispatch<React.SetStateAction<number | ''>>;
  editCurrExtensao: number | '';
  setEditCurrExtensao: React.Dispatch<React.SetStateAction<number | ''>>;
  editCurrTotal: number | '';
  setEditCurrTotal: React.Dispatch<React.SetStateAction<number | ''>>;
  editCurrEmenta: string;
  setEditCurrEmenta: React.Dispatch<React.SetStateAction<string>>;
  editCurrPrereqs: { code: string; name: string }[];
  setEditCurrPrereqs: React.Dispatch<React.SetStateAction<{ code: string; name: string }[]>>;
  newPrereqCode: string;
  setNewPrereqCode: React.Dispatch<React.SetStateAction<string>>;
  newPrereqName: string;
  setNewPrereqName: React.Dispatch<React.SetStateAction<string>>;
  handleStartEditCurriculum: (index: number, sub: CurriculumSubject) => void;
  handleSaveCurriculumEdit: () => void;
  handleAddPrereqToCurriculumEdit: () => void;
  handleRemovePrereqFromCurriculumEdit: (code: string) => void;
  handleDeleteCurriculumItem: (index: number) => void;
  handleAddBlankCurriculumSubject: () => void;
}

export function useCurriculumEditor({
  curriculumSubjects,
  setCurriculumSubjects,
  filterProfile
}: UseCurriculumEditorParams): UseCurriculumEditorReturn {
  const [editingCurrIndex, setEditingCurrIndex] = useState<number | null>(null);
  const [editCurrCode, setEditCurrCode] = useState('');
  const [editCurrName, setEditCurrName] = useState('');
  const [editCurrType, setEditCurrType] = useState('Obrigatório');
  const [editCurrPeriod, setEditCurrPeriod] = useState('1');
  const [editCurrProfile, setEditCurrProfile] = useState<string>('');
  const [editCurrCredits, setEditCurrCredits] = useState<number | ''>('');
  const [editCurrTeorica, setEditCurrTeorica] = useState<number | ''>('');
  const [editCurrPratica, setEditCurrPratica] = useState<number | ''>('');
  const [editCurrExtensao, setEditCurrExtensao] = useState<number | ''>('');
  const [editCurrTotal, setEditCurrTotal] = useState<number | ''>('');
  const [editCurrEmenta, setEditCurrEmenta] = useState('');
  const [editCurrPrereqs, setEditCurrPrereqs] = useState<{ code: string; name: string }[]>([]);
  const [newPrereqCode, setNewPrereqCode] = useState('');
  const [newPrereqName, setNewPrereqName] = useState('');

  const handleStartEditCurriculum = (index: number, sub: CurriculumSubject) => {
    setEditingCurrIndex(index);
    setEditCurrCode(sub.code || '');
    setEditCurrName(sub.name);
    setEditCurrType(sub.type || '');
    setEditCurrPeriod(sub.period != null ? String(sub.period) : '');
    setEditCurrProfile(sub.profile || '');
    setEditCurrCredits(sub.credits ?? '');
    setEditCurrTeorica(sub.workload?.teorica ?? '');
    setEditCurrPratica(sub.workload?.pratica ?? '');
    setEditCurrExtensao(sub.workload?.extensao ?? '');
    setEditCurrTotal(sub.workload?.total ?? '');
    setEditCurrEmenta(sub.ementa || '');
    setEditCurrPrereqs(sub.prerequisites ? [...sub.prerequisites] : []);
  };

  const handleSaveCurriculumEdit = () => {
    if (editingCurrIndex === null) return;
    setCurriculumSubjects(prev => {
      const updated = [...prev];
      const total = editCurrTotal === '' ? null : Number(editCurrTotal);
      updated[editingCurrIndex] = {
        ...updated[editingCurrIndex],
        code: editCurrCode.trim() || null,
        name: editCurrName,
        type: editCurrType || null,
        period: editCurrPeriod || null,
        profile: editCurrProfile.trim() || undefined,
        credits: editCurrCredits === '' ? null : Number(editCurrCredits),
        workload: {
          ...updated[editingCurrIndex].workload,
          teorica: editCurrTeorica === '' ? null : Number(editCurrTeorica),
          pratica: editCurrPratica === '' ? null : Number(editCurrPratica),
          extensao: editCurrExtensao === '' ? null : Number(editCurrExtensao),
          total
        },
        prerequisites: editCurrPrereqs.length ? editCurrPrereqs : updated[editingCurrIndex].prerequisites == null ? null : [],
        ementa: editCurrEmenta || null
      };
      return updated;
    });
    setEditingCurrIndex(null);
  };

  const handleAddPrereqToCurriculumEdit = () => {
    if (!newPrereqCode || !newPrereqName) return;
    setEditCurrPrereqs(prev => [...prev, { code: newPrereqCode.trim(), name: newPrereqName.trim() }]);
    setNewPrereqCode('');
    setNewPrereqName('');
  };

  const handleRemovePrereqFromCurriculumEdit = (code: string) => {
    setEditCurrPrereqs(prev => prev.filter(p => p.code !== code));
  };

  const handleDeleteCurriculumItem = (index: number) => {
    setCurriculumSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankCurriculumSubject = () => {
    const newSub: CurriculumSubject = {
      id: crypto.randomUUID(),
      code: null,
      name: 'Nova Disciplina da Matriz',
      type: 'Obrigatório',
      period: '1',
      profile: filterProfile !== 'all' ? filterProfile : undefined,
      credits: null,
      workload: { teorica: null, pratica: null, extensao: null, total: null },
      prerequisites: [],
      ementa: 'Descrição dos conteúdos programáticos.'
    };
    setCurriculumSubjects(prev => [...prev, newSub]);
    handleStartEditCurriculum(curriculumSubjects.length, newSub);
  };

  return {
    editingCurrIndex, setEditingCurrIndex,
    editCurrCode, setEditCurrCode,
    editCurrName, setEditCurrName,
    editCurrType, setEditCurrType,
    editCurrPeriod, setEditCurrPeriod,
    editCurrProfile, setEditCurrProfile,
    editCurrCredits, setEditCurrCredits,
    editCurrTeorica, setEditCurrTeorica,
    editCurrPratica, setEditCurrPratica,
    editCurrExtensao, setEditCurrExtensao,
    editCurrTotal, setEditCurrTotal,
    editCurrEmenta, setEditCurrEmenta,
    editCurrPrereqs, setEditCurrPrereqs,
    newPrereqCode, setNewPrereqCode,
    newPrereqName, setNewPrereqName,
    handleStartEditCurriculum,
    handleSaveCurriculumEdit,
    handleAddPrereqToCurriculumEdit,
    handleRemovePrereqFromCurriculumEdit,
    handleDeleteCurriculumItem,
    handleAddBlankCurriculumSubject
  };
}
