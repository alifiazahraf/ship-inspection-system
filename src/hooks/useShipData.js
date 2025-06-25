import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

export const useShipData = (shipId = null) => {
  const [ships, setShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchShips = async () => {
    setLoading(true);
    try {
      const { data: shipsData, error: shipsError } = await supabase
        .from('ships')
        .select('*');

      if (shipsError) {
        console.error('Error fetching ships:', shipsError);
        toast.error('Gagal memuat data kapal');
        return;
      }

      // Fetch all findings to calculate latest inspection dates
      const { data: findingsData, error: findingsError } = await supabase
        .from('findings')
        .select('*');

      if (findingsError) {
        console.error('Error fetching findings:', findingsError);
        toast.error('Gagal memuat data temuan');
        return;
      }

      // Process ships to include latest inspection date
      const processedShips = shipsData.map(ship => {
        const shipFindings = findingsData.filter(f => f.ship_id === ship.id);
        if (shipFindings.length > 0) {
          const latestDate = shipFindings.reduce((latest, finding) => {
            return finding.date > latest ? finding.date : latest;
          }, shipFindings[0].date);
          return { ...ship, last_inspection: latestDate };
        }
        return ship;
      });

      setShips(processedShips);
    } catch (error) {
      console.error('Unexpected error fetching ships:', error);
      toast.error('Terjadi kesalahan saat memuat data kapal');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleShip = async (id) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ships')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching ship:', error);
        toast.error('Gagal memuat data kapal');
        return;
      }

      setSelectedShip(data);
    } catch (error) {
      console.error('Unexpected error fetching ship:', error);
      toast.error('Terjadi kesalahan saat memuat data kapal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shipId) {
      fetchSingleShip(shipId);
    } else {
      fetchShips();
    }
  }, [shipId]);

  return {
    ships,
    selectedShip,
    loading,
    refetch: shipId ? () => fetchSingleShip(shipId) : fetchShips,
    setSelectedShip
  };
}; 