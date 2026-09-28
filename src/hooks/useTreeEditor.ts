import React, { useState } from 'react';
import { CurriculumSubject, CurriculumProfile, TreeSubjectNode } from '../types';
import { normalizeAcademicName, treeToCurriculum, validateExtraction } from '../utils/extraction';

export interface UseTreeEditorParams {
  extractedTreeSubjects: TreeSubjectNode[];
  setExtractedTreeSubjects: React.Dispatch<React.SetStateAction<TreeSubjectNode[]>>;
  curriculumSubjects: CurriculumSubject[];
  setCurriculumSubjects: React.Dispatch<React.SetStateAction<CurriculumSubject[]>>;
  extractedProfile: CurriculumProfile | null;
}

export interface UseTreeEditorReturn {
  selectedTreePeriod: number | 'all';
  setSelectedTreePeriod: React.Dispatch<React.SetStateAction<number | 'all'>>;
  editingTreeNodeIndex: number | null;
  setEditingTreeNodeIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editTreeNode: TreeSubjectNode | null;
  setEditTreeNode: React.Dispatch<React.SetStateAction<TreeSubjectNode | null>>;
  treeSearch: string;
  setTreeSearch: React.Dispatch<React.SetStateAction<string>>;
  newPrereqSelect: string;
  setNewPrereqSelect: React.Dispatch<React.SetStateAction<string>>;
  resolveTreePrerequisiteReferences: (nodes: TreeSubjectNode[]) => TreeSubjectNode[];
  handleStartEditTreeNode: (index: number, node: TreeSubjectNode) => void;
  handleSaveTreeNodeEdit: () => void;
  handleDeleteTreeNode: (index: number) => void;
  handleAddBlankTreeNode: () => void;
  handleAddPrereqToTreeNode: (targetCodeOrId: string) => void;
  handleRemovePrereqFromTreeNode: (targetCodeOrId: string) => void;
}

export function useTreeEditor({
  extractedTreeSubjects,
  setExtractedTreeSubjects,
  curriculumSubjects,
  setCurriculumSubjects,
  extractedProfile
}: UseTreeEditorParams): UseTreeEditorReturn {
  const [selectedTreePeriod, setSelectedTreePeriod] = useState<number | 'all'>('all');
  const [editingTreeNodeIndex, setEditingTreeNodeIndex] = useState<number | null>(null);
  const [editTreeNode, setEditTreeNode] = useState<TreeSubjectNode | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [newPrereqSelect, setNewPrereqSelect] = useState('');

  const resolveTreePrerequisiteReferences = (nodes: TreeSubjectNode[]): TreeSubjectNode[] => {
    const idSet = new Set(nodes.map(node => node.id));
    const byCode = new Map<string, string[]>();
    const byName = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.code?.trim()) {
        const key = node.code.trim().toLowerCase();
        byCode.set(key, [...(byCode.get(key) || []), node.id]);
      }
      const name = normalizeAcademicName(node.name);
      if (name) byName.set(name, [...(byName.get(name) || []), node.id]);
    }
    return nodes.map(node => ({
      ...node,
      prereqs: node.prereqs?.map(reference => {
        if (idSet.has(reference)) return reference;
        const codeMatches = byCode.get(reference.trim().toLowerCase()) || [];
        if (codeMatches.length === 1) return codeMatches[0];
        const normalizedName = normalizeAcademicName(reference);
        const nameMatches = byName.get(normalizedName) || [];
        return nameMatches.length === 1 ? nameMatches[0] : reference;
      }) ?? null
    }));
  };

  const handleStartEditTreeNode = (index: number, node: TreeSubjectNode) => {
    setEditingTreeNodeIndex(index);
    setEditTreeNode({ ...node, prereqs: node.prereqs == null ? null : [...node.prereqs] });
    setNewPrereqSelect('');
  };

  const handleSaveTreeNodeEdit = () => {
    if (editingTreeNodeIndex === null || !editTreeNode) return;
    const nextNodes = extractedTreeSubjects.map((node, index) => index === editingTreeNodeIndex ? editTreeNode : node);
    const errors = validateExtraction(nextNodes, 'tree').filter(issue => issue.severity === 'error');
    if (errors.length) { window.alert(errors.map(issue => `${issue.record}: ${issue.message}`).join('\n')); return; }
    setExtractedTreeSubjects(prev => {
      const updated = [...prev];
      updated[editingTreeNodeIndex] = editTreeNode;
      return updated;
    });

    const mapped = treeToCurriculum(nextNodes, null);
    setCurriculumSubjects(previous => mapped.map(subject => ({ ...previous.find(item => item.id === subject.id), ...subject })));

    setEditingTreeNodeIndex(null);
    setEditTreeNode(null);
  };

  const handleDeleteTreeNode = (index: number) => {
    const nodeToDelete = extractedTreeSubjects[index];
    setExtractedTreeSubjects(prev => prev.filter((_, i) => i !== index));
    if (nodeToDelete) {
      setCurriculumSubjects(prev => prev.filter(s => s.id !== nodeToDelete.id));
    }
  };

  const handleAddBlankTreeNode = () => {
    const id = `NODE_${Date.now()}`;
    const newNode: TreeSubjectNode = {
      id,
      profile: extractedProfile?.id,
      code: 'DISC' + Math.floor(1000 + Math.random() * 9000),
      name: 'Nova Disciplina da Matriz',
      period: selectedTreePeriod !== 'all' ? Number(selectedTreePeriod) : 1,
      hours: 60,
      type: 'computacao',
      prereqs: [],
      desc: ''
    };
    setExtractedTreeSubjects(prev => [...prev, newNode]);
    setCurriculumSubjects(prev => [...prev, ...treeToCurriculum([newNode], extractedProfile?.id || null)]);
    handleStartEditTreeNode(extractedTreeSubjects.length, newNode);
  };

  const handleAddPrereqToTreeNode = (targetCodeOrId: string) => {
    if (!editTreeNode || !targetCodeOrId || (editTreeNode.prereqs || []).includes(targetCodeOrId)) return;
    setEditTreeNode({
      ...editTreeNode,
      prereqs: [...(editTreeNode.prereqs || []), targetCodeOrId]
    });
    setNewPrereqSelect('');
  };

  const handleRemovePrereqFromTreeNode = (targetCodeOrId: string) => {
    if (!editTreeNode) return;
    setEditTreeNode({
      ...editTreeNode,
      prereqs: (editTreeNode.prereqs || []).filter(p => p !== targetCodeOrId)
    });
  };

  return {
    selectedTreePeriod, setSelectedTreePeriod,
    editingTreeNodeIndex, setEditingTreeNodeIndex,
    editTreeNode, setEditTreeNode,
    treeSearch, setTreeSearch,
    newPrereqSelect, setNewPrereqSelect,
    resolveTreePrerequisiteReferences,
    handleStartEditTreeNode,
    handleSaveTreeNodeEdit,
    handleDeleteTreeNode,
    handleAddBlankTreeNode,
    handleAddPrereqToTreeNode,
    handleRemovePrereqFromTreeNode
  };
}
