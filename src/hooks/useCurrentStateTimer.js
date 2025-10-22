import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export function useCurrentStateTimer() {
  const [currentState, setCurrentState] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch current state from database
  const fetchCurrentState = async () => {
    try {
      const { data, error } = await supabase
        .from('current_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setCurrentState(data);
      
      // If there's a timer running, calculate remaining time
      if (data?.timer_started_at && data?.timer_duration_minutes) {
        const startTime = new Date(data.timer_started_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const totalSeconds = data.timer_duration_minutes * 60;
        const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
        
        setTimeRemaining(remainingSeconds);
        setIsRunning(remainingSeconds > 0);
        setIsPaused(data.paused || false);
        startTimeRef.current = startTime;
      } else {
        setTimeRemaining(0);
        setIsRunning(false);
        setIsPaused(false);
        startTimeRef.current = null;
      }
    } catch (err) {
      console.error('Error fetching current state:', err);
    }
  };

  // Start timer
  const startTimer = async (customerName, timeMinutes, seatId, barberId, appointmentId) => {
    console.log('startTimer called with:', { customerName, timeMinutes, seatId, barberId, appointmentId });
    
    try {
      const updateData = {
        customer_name: customerName,
        approx_time_minutes: timeMinutes,
        seat_id: seatId,
        barber_id: barberId,
        paused: false,
        timer_started_at: new Date().toISOString(),
        timer_duration_minutes: timeMinutes,
        appointment_id: appointmentId
      };
      
      console.log('Updating current_state with:', updateData);
      
      const { error } = await supabase
        .from('current_state')
        .update(updateData)
        .eq('id', 1);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Database update successful');
      
      setTimeRemaining(timeMinutes * 60);
      setIsRunning(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      await fetchCurrentState();
      console.log('Timer started successfully');
    } catch (err) {
      console.error('Error starting timer:', err);
      throw err;
    }
  };

  // Pause/Resume timer
  const togglePause = async () => {
    try {
      const newPausedState = !isPaused;
      const { error } = await supabase
        .from('current_state')
        .update({ paused: newPausedState })
        .eq('id', 1);

      if (error) throw error;
      
      setIsPaused(newPausedState);
      if (newPausedState) {
        // Store the time when paused
        startTimeRef.current = Date.now();
      }
      
      await fetchCurrentState();
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  };

  // Stop timer and move to next
  const stopTimer = async () => {
    try {
      // Capture seat id before clearing state so we can mark it available
      const seatId = currentState?.seat_id;
      const { error } = await supabase
        .from('current_state')
        .update({
          customer_name: null,
          approx_time_minutes: null,
          seat_id: null,
          barber_id: null,
          paused: false,
          timer_started_at: null,
          timer_duration_minutes: null,
          appointment_id: null
        })
        .eq('id', 1);

      if (error) throw error;
      
      // When there is no current customer, mark the seat available
      if (seatId) {
        try {
          await supabase
            .from('seats')
            .update({ state: 'available', expires_at: null })
            .eq('id', seatId);
        } catch (e) {
          console.warn('Failed to update seat availability:', e);
        }
      }

      setTimeRemaining(0);
      setIsRunning(false);
      setIsPaused(false);
      startTimeRef.current = null;
      
      await fetchCurrentState();
    } catch (err) {
      console.error('Error stopping timer:', err);
    }
  };

  // Update time remaining
  const updateTimeRemaining = async (newMinutes) => {
    try {
      const { error } = await supabase
        .from('current_state')
        .update({ approx_time_minutes: newMinutes })
        .eq('id', 1);

      if (error) throw error;
      
      setTimeRemaining(newMinutes * 60);
      startTimeRef.current = Date.now();
      
      await fetchCurrentState();
    } catch (err) {
      console.error('Error updating time:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeRemaining]);

  // Real-time subscription
  useEffect(() => {
    fetchCurrentState();

    const subscription = supabase
      .channel('current-state-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'current_state' },
        (payload) => {
          setCurrentState(payload.new);
          
          if (payload.new?.timer_started_at && payload.new?.timer_duration_minutes) {
            const startTime = new Date(payload.new.timer_started_at).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            const totalSeconds = payload.new.timer_duration_minutes * 60;
            const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
            
            setTimeRemaining(remainingSeconds);
            setIsRunning(remainingSeconds > 0);
            setIsPaused(payload.new.paused || false);
            startTimeRef.current = startTime;
          } else {
            setTimeRemaining(0);
            setIsRunning(false);
            setIsPaused(false);
            startTimeRef.current = null;
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    currentState,
    timeRemaining,
    isRunning,
    isPaused,
    startTimer,
    togglePause,
    stopTimer,
    updateTimeRemaining,
    formatTime,
    fetchCurrentState
  };
}
