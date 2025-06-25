import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

export const useFindingData = (shipId) => {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedUser, setAssignedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [latestInspectionDate, setLatestInspectionDate] = useState(null);

  const fetchShipData = async () => {
    if (!shipId) return;
    
    setLoading(true);
    setLoadingUser(true);

    const fetchFindingsPromise = supabase
      .from('findings')
      .select('*')
      .eq('ship_id', shipId)
      .order('no', { ascending: true });

    const fetchUserPromise = supabase
      .from('assignments')
      .select('user_id')
      .eq('ship_id', shipId)
      .limit(1)
      .single();

    try {
      const [findingsResult, assignmentResult] = await Promise.all([fetchFindingsPromise, fetchUserPromise]);

      if (findingsResult.error) {
        toast.error('Gagal memuat data temuan');
      } else {
        setFindings(findingsResult.data);
        if (findingsResult.data && findingsResult.data.length > 0) {
          const latestDate = findingsResult.data.reduce((latest, finding) => {
            return finding.date > latest ? finding.date : latest;
          }, findingsResult.data[0].date);
          setLatestInspectionDate(latestDate);
        }
      }

      if (!assignmentResult.error && assignmentResult.data) {
        const { data: userData, error: userError } = await supabase
          .from('user_list')
          .select('email')
          .eq('id', assignmentResult.data.user_id)
          .single();
        
        if (!userError) {
          setAssignedUser(userData);
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memuat data kapal.');
    } finally {
      setLoading(false);
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchShipData();
  }, [shipId]);

  return {
    findings,
    loading,
    assignedUser,
    loadingUser,
    latestInspectionDate,
    refetch: fetchShipData
  };
}; 