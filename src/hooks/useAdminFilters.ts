import { useState, useEffect, useMemo } from 'react';
import { Discipline, CurriculumSubject } from '../types';

export interface UseAdminFiltersParams {
  disciplines: Discipline[];
  curriculumSubjects: CurriculumSubject[];
  activeMode: 'curriculum' | 'schedule';
}

export function useAdminFilters({ disciplines, curriculumSubjects, activeMode }: UseAdminFiltersParams) {
  const [filters, setFilters] = useState({
    curriculum: { period: 'all', profile: 'all', search: '' },
    schedule: { period: 'all', profile: 'all', search: '' },
  });
  const filterPeriod = filters[activeMode].period;
  const filterProfile = filters[activeMode].profile;
  const searchFilter = filters[activeMode].search;
  const setField = (key: 'period' | 'profile' | 'search', update: string | ((previous: string) => string)) => setFilters(previous => ({
    ...previous, [activeMode]: { ...previous[activeMode], [key]: typeof update === 'function' ? update(previous[activeMode][key]) : update }
  }));
  const setFilterPeriod = (value: string | ((previous: string) => string)) => setField('period', value);
  const setFilterProfile = (value: string | ((previous: string) => string)) => setField('profile', value);
  const setSearchFilter = (value: string | ((previous: string) => string)) => setField('search', value);
  const resetFilters = () => setFilters({ curriculum: { period: 'all', profile: 'all', search: '' }, schedule: { period: 'all', profile: 'all', search: '' } });

  const availableScheduleProfiles = useMemo(() => {
    const set = new Set<string>();
    disciplines.forEach(d => {
      const prof = (d.profile || '').trim();
      if (prof && prof.toLowerCase() !== 'optativa' && prof.toLowerCase() !== 'sem perfil') {
        set.add(prof);
      }
    });
    return Array.from(set).sort();
  }, [disciplines]);

  const availableCurriculumProfiles = useMemo(() => {
    const set = new Set<string>();
    curriculumSubjects.forEach(s => {
      const prof = (s.profile || '').trim();
      if (prof && prof.toLowerCase() !== 'optativa' && prof.toLowerCase() !== 'sem perfil') {
        set.add(prof);
      }
    });
    return Array.from(set).sort();
  }, [curriculumSubjects]);

  const activeProfiles = activeMode === 'curriculum' ? availableCurriculumProfiles : availableScheduleProfiles;

  const filteredCurriculum = useMemo(() => {
    return curriculumSubjects.filter(sub => {
      const matchPeriod = filterPeriod === 'all' || sub.period?.toString() === filterPeriod;
      const matchProfile = filterProfile === 'all' || sub.profile === filterProfile || (!sub.profile && filterProfile === 'Sem Perfil');
      const matchSearch = !searchFilter || 
        (sub.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (sub.code || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (sub.profile && sub.profile.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchPeriod && matchProfile && matchSearch;
    });
  }, [curriculumSubjects, filterPeriod, filterProfile, searchFilter]);

  const filteredSchedule = useMemo(() => {
    return disciplines.filter(disc => {
      const matchPeriod = filterPeriod === 'all' || disc.period?.toString() === filterPeriod;
      const matchProfile = filterProfile === 'all' || disc.profile === filterProfile || (!disc.profile && filterProfile === 'Sem Perfil');
      const matchSearch = !searchFilter || 
        (disc.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (disc.code && disc.code.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (disc.professor || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (disc.profile && disc.profile.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchPeriod && matchProfile && matchSearch;
    });
  }, [disciplines, filterPeriod, filterProfile, searchFilter]);

  return {
    resetFilters,
    filterPeriod,
    setFilterPeriod,
    filterProfile,
    setFilterProfile,
    searchFilter,
    setSearchFilter,
    availableScheduleProfiles,
    availableCurriculumProfiles,
    activeProfiles,
    filteredCurriculum,
    filteredSchedule
  };
}
