import React, { useState, useCallback } from 'react';
import { CurriculumProfile, TreeSubjectNode, CurriculumSubject } from '../types';

export interface UseProfileManagerParams {
  courseProfiles: CurriculumProfile[];
  setCourseProfiles: React.Dispatch<React.SetStateAction<CurriculumProfile[]>>;
  extractedProfile: CurriculumProfile | null;
  setExtractedProfile: React.Dispatch<React.SetStateAction<CurriculumProfile | null>>;
  extractedTreeSubjects: TreeSubjectNode[];
  setExtractedTreeSubjects: React.Dispatch<React.SetStateAction<TreeSubjectNode[]>>;
  curriculumSubjects: CurriculumSubject[];
  setCurriculumSubjects: React.Dispatch<React.SetStateAction<CurriculumSubject[]>>;
  filterProfile: string;
  setFilterProfile: React.Dispatch<React.SetStateAction<string>>;
  setSuccessMsg: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useProfileManager({
  courseProfiles,
  setCourseProfiles,
  extractedProfile,
  setExtractedProfile,
  extractedTreeSubjects,
  setExtractedTreeSubjects,
  curriculumSubjects,
  setCurriculumSubjects,
  filterProfile,
  setFilterProfile,
  setSuccessMsg
}: UseProfileManagerParams) {
  const [isEditingProfileMeta, setIsEditingProfileMeta] = useState(false);
  const [editProfileMeta, setEditProfileMeta] = useState<CurriculumProfile | null>(null);
  const [profilePendingDelete, setProfilePendingDelete] = useState<CurriculumProfile | null>(null);

  const handleSelectProfileToReview = useCallback((profileId: string) => {
    const target = courseProfiles.find(p => p.id === profileId);
    setExtractedProfile(target || null);
    setFilterProfile(profileId || 'all');
  }, [courseProfiles, setExtractedProfile, setFilterProfile]);

  const handleAddNewProfile = useCallback(() => {
    let nextProfileNumber = courseProfiles.length + 1;
    while (courseProfiles.some(profile => profile.id === `PERFIL_${nextProfileNumber}`)) {
      nextProfileNumber += 1;
    }
    const newId = `PERFIL_${nextProfileNumber}`;
    const newProf: CurriculumProfile = {
      id: newId,
      name: `Grade Curricular ${newId}`,
      validFromSemester: '',
      totalHours: null,
      acexHours: null,
      accHours: null,
      optativeHours: null,
      mandatoryHours: null,
      subjects: []
    };
    setCourseProfiles(prev => [...prev, newProf]);
    setExtractedProfile(newProf);
    setFilterProfile(newId);
    setEditProfileMeta(newProf);
    setIsEditingProfileMeta(true);
  }, [courseProfiles, setCourseProfiles, setExtractedProfile, setExtractedTreeSubjects]);

  const handleConfirmDeleteProfile = useCallback(() => {
    if (!profilePendingDelete) return;
    const id = profilePendingDelete.id;
    const remaining = courseProfiles.filter(profile => profile.id !== id);
    setCourseProfiles(remaining);
    setCurriculumSubjects(previous => previous.filter(subject => subject.profile !== id));
    setExtractedTreeSubjects(previous => previous.filter(node => node.profile !== id));
    if (extractedProfile?.id === id) setExtractedProfile(remaining[0] || null);
    if (filterProfile === id) setFilterProfile('all');
    setSuccessMsg(`Perfil ${id} removido do rascunho. Salve o currículo para gravar.`);
    setProfilePendingDelete(null);
  }, [profilePendingDelete, courseProfiles, extractedProfile, filterProfile, setCourseProfiles, setCurriculumSubjects, setExtractedTreeSubjects, setExtractedProfile, setFilterProfile, setSuccessMsg]);

  const handleStartEditProfileMeta = useCallback(() => {
    if (!extractedProfile) return;
    setEditProfileMeta({ ...extractedProfile });
    setIsEditingProfileMeta(true);
  }, [extractedProfile]);

  const handleSaveProfileMeta = useCallback(() => {
    if (!editProfileMeta) return;
    setExtractedProfile(editProfileMeta);
    setCourseProfiles(prev => {
      const idx = prev.findIndex(p => p.id === editProfileMeta.id);
      if (idx > -1) {
        const list = [...prev];
        list[idx] = { ...editProfileMeta, subjects: extractedTreeSubjects.filter(node => node.profile === editProfileMeta.id) };
        return list;
      }
      return [...prev, { ...editProfileMeta, subjects: extractedTreeSubjects.filter(node => node.profile === editProfileMeta.id) }];
    });
    setIsEditingProfileMeta(false);
    setEditProfileMeta(null);
  }, [editProfileMeta, extractedTreeSubjects, setExtractedProfile, setCourseProfiles]);

  return {
    isEditingProfileMeta,
    setIsEditingProfileMeta,
    editProfileMeta,
    setEditProfileMeta,
    profilePendingDelete,
    setProfilePendingDelete,
    handleSelectProfileToReview,
    handleAddNewProfile,
    handleConfirmDeleteProfile,
    handleStartEditProfileMeta,
    handleSaveProfileMeta
  };
}
