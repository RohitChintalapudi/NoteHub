// Pomodoro Timer JavaScript

let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isRunning = false;
let isFocusMode = true;
let completedPomodoros = 0;
let focusMinutes = 0;
let startTime = null;

// Load settings and stats from localStorage
function loadSettings() {
  const savedFocusTime = localStorage.getItem('pomodoroFocusTime');
  const savedBreakTime = localStorage.getItem('pomodoroBreakTime');
  const savedPomodoros = localStorage.getItem('pomodoroCount');
  const savedFocusMinutes = localStorage.getItem('pomodoroFocusMinutes');

  if (savedFocusTime) {
    document.getElementById('focus-time').value = savedFocusTime;
  }
  if (savedBreakTime) {
    document.getElementById('break-time').value = savedBreakTime;
  }
  if (savedPomodoros) {
    completedPomodoros = parseInt(savedPomodoros);
    document.getElementById('completed-pomodoros').textContent = completedPomodoros;
  }
  if (savedFocusMinutes) {
    focusMinutes = parseInt(savedFocusMinutes);
    document.getElementById('focus-minutes').textContent = focusMinutes;
  }

  // Try to load timer state first, otherwise initialize with saved focus time
  loadTimerState();
  
  // If no timer state was loaded, initialize with default
  if (!localStorage.getItem('pomodoroTimerState')) {
    const focusTime = savedFocusTime ? parseInt(savedFocusTime) : 25;
    timeLeft = focusTime * 60;
    updateDisplay();
  }
}

// Save timer state to localStorage
function saveTimerState() {
  const timerState = {
    timeLeft: timeLeft,
    isRunning: isRunning,
    isFocusMode: isFocusMode,
    startTime: startTime ? startTime : null,
    timestamp: Date.now()
  };
  localStorage.setItem('pomodoroTimerState', JSON.stringify(timerState));
}

// Load timer state from localStorage
function loadTimerState() {
  const savedState = localStorage.getItem('pomodoroTimerState');
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      const elapsed = state.isRunning ? Math.floor((Date.now() - state.timestamp) / 1000) : 0;
      timeLeft = Math.max(0, state.timeLeft - elapsed);
      isFocusMode = state.isFocusMode;
      
      // Update mode display
      if (isFocusMode) {
        document.getElementById('timer-mode').textContent = 'Focus';
        document.getElementById('timer-mode').classList.remove('break-mode');
        document.getElementById('timer-mode').classList.add('focus-mode');
      } else {
        document.getElementById('timer-mode').textContent = 'Break';
        document.getElementById('timer-mode').classList.remove('focus-mode');
        document.getElementById('timer-mode').classList.add('break-mode');
      }
      
      // If timer was running and still has time, resume it
      if (state.isRunning && timeLeft > 0) {
        startTime = Date.now() - (state.timeLeft - timeLeft) * 1000;
        isRunning = true;
        document.getElementById('start-pause-btn').textContent = 'Pause';
        document.getElementById('start-pause-btn').classList.add('paused');
        
        timerInterval = setInterval(() => {
          timeLeft--;
          updateDisplay();
          saveTimerState();

          if (timeLeft <= 0) {
            completeTimer();
          }
        }, 1000);
      } else {
        // Timer completed or was paused
        isRunning = false;
        if (timeLeft <= 0) {
          // Timer completed while page was closed
          if (isFocusMode) {
            const breakTime = parseInt(document.getElementById('break-time').value);
            timeLeft = breakTime * 60;
            isFocusMode = false;
            document.getElementById('timer-mode').textContent = 'Break';
            document.getElementById('timer-mode').classList.remove('focus-mode');
            document.getElementById('timer-mode').classList.add('break-mode');
          } else {
            const focusTime = parseInt(document.getElementById('focus-time').value);
            timeLeft = focusTime * 60;
            isFocusMode = true;
            document.getElementById('timer-mode').textContent = 'Focus';
            document.getElementById('timer-mode').classList.remove('break-mode');
            document.getElementById('timer-mode').classList.add('focus-mode');
          }
        }
      }
      
      updateDisplay();
    } catch (err) {
      console.error('Error loading timer state:', err);
    }
  }
}

// Save settings to localStorage
function saveSettings() {
  const focusTime = parseInt(document.getElementById('focus-time').value);
  const breakTime = parseInt(document.getElementById('break-time').value);

  if (focusTime < 1 || focusTime > 60) {
    alert('Focus time must be between 1 and 60 minutes');
    return;
  }
  if (breakTime < 1 || breakTime > 30) {
    alert('Break time must be between 1 and 30 minutes');
    return;
  }

  localStorage.setItem('pomodoroFocusTime', focusTime);
  localStorage.setItem('pomodoroBreakTime', breakTime);

  // If timer is not running, update the display
  if (!isRunning) {
    if (isFocusMode) {
      timeLeft = focusTime * 60;
    } else {
      timeLeft = breakTime * 60;
    }
    updateDisplay();
  }

  alert('Settings saved!');
}

// Update timer display
function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('timer-time').textContent = timeString;

  // Update progress circle
  const totalTime = isFocusMode
    ? parseInt(document.getElementById('focus-time').value) * 60
    : parseInt(document.getElementById('break-time').value) * 60;
  const progress = 1 - (timeLeft / totalTime);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - progress);

  const progressCircle = document.getElementById('timer-progress');
  progressCircle.style.strokeDasharray = circumference;
  progressCircle.style.strokeDashoffset = offset;
  
  // Update progress circle color based on mode
  if (isFocusMode) {
    progressCircle.style.stroke = '#4338ca';
  } else {
    progressCircle.style.stroke = '#22c55e';
  }
}

// Start/Pause timer
function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

// Start timer
function startTimer() {
  if (timeLeft <= 0) return;

  isRunning = true;
  startTime = Date.now();
  document.getElementById('start-pause-btn').textContent = 'Pause';
  document.getElementById('start-pause-btn').classList.add('paused');
  
  saveTimerState();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    saveTimerState();

    if (timeLeft <= 0) {
      completeTimer();
    }
  }, 1000);
}

// Pause timer
function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  document.getElementById('start-pause-btn').textContent = 'Start';
  document.getElementById('start-pause-btn').classList.remove('paused');

  // Calculate and save focus minutes if in focus mode
  if (isFocusMode && startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
    focusMinutes += elapsed;
    localStorage.setItem('pomodoroFocusMinutes', focusMinutes);
    document.getElementById('focus-minutes').textContent = focusMinutes;
    startTime = null;
  }
  
  saveTimerState();
}

// Complete timer
function completeTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  document.getElementById('start-pause-btn').textContent = 'Start';
  document.getElementById('start-pause-btn').classList.remove('paused');

  if (isFocusMode) {
    // Focus session completed
    completedPomodoros++;
    const focusTime = parseInt(document.getElementById('focus-time').value);
    focusMinutes += focusTime;
    
    localStorage.setItem('pomodoroCount', completedPomodoros);
    localStorage.setItem('pomodoroFocusMinutes', focusMinutes);
    
    document.getElementById('completed-pomodoros').textContent = completedPomodoros;
    document.getElementById('focus-minutes').textContent = focusMinutes;

    // Play notification sound (using Web Audio API)
    playNotificationSound();
    
    // Switch to break mode
    const breakTime = parseInt(document.getElementById('break-time').value);
    timeLeft = breakTime * 60;
    isFocusMode = false;
    document.getElementById('timer-mode').textContent = 'Break';
    document.getElementById('timer-mode').classList.remove('focus-mode');
    document.getElementById('timer-mode').classList.add('break-mode');
    
    alert('🎉 Focus session completed! Time for a break.');
  } else {
    // Break completed
    playNotificationSound();
    
    // Switch to focus mode
    const focusTime = parseInt(document.getElementById('focus-time').value);
    timeLeft = focusTime * 60;
    isFocusMode = true;
    document.getElementById('timer-mode').textContent = 'Focus';
    document.getElementById('timer-mode').classList.remove('break-mode');
    document.getElementById('timer-mode').classList.add('focus-mode');
    
    alert('Break completed! Ready for another focus session?');
  }

  updateDisplay();
  // Clear timer state when completed (will be saved fresh on next start)
  localStorage.removeItem('pomodoroTimerState');
}

// Reset timer
function resetTimer() {
  if (isRunning) {
    pauseTimer();
  }

  if (isFocusMode) {
    const focusTime = parseInt(document.getElementById('focus-time').value);
    timeLeft = focusTime * 60;
  } else {
    const breakTime = parseInt(document.getElementById('break-time').value);
    timeLeft = breakTime * 60;
  }

  updateDisplay();
  // Clear timer state on reset so it starts fresh
  localStorage.removeItem('pomodoroTimerState');
}

// Reset stats
function resetStats() {
  if (confirm('Are you sure you want to reset all statistics?')) {
    completedPomodoros = 0;
    focusMinutes = 0;
    localStorage.removeItem('pomodoroCount');
    localStorage.removeItem('pomodoroFocusMinutes');
    document.getElementById('completed-pomodoros').textContent = '0';
    document.getElementById('focus-minutes').textContent = '0';
  }
}

// Play notification sound
function playNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  updateDisplay();

  document.getElementById('start-pause-btn').addEventListener('click', toggleTimer);
  document.getElementById('reset-btn').addEventListener('click', resetTimer);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('reset-stats').addEventListener('click', resetStats);

  // Initialize mode display
  document.getElementById('timer-mode').classList.add('focus-mode');
});

