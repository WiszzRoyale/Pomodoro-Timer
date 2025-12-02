new Vue({
  el: '#app',
  data: {
    isLoggedIn: false,
    username: '',
    studentId: '',
    profilePic: '',
    location: '',
    currentDay: 1,
    showSettings: false,
    showProgressReport: false,
    
    // Timer data
    studyTime: 25,
    breakTime: 5,
    timerTime: 25 * 60,
    isRunning: false,
    isStudyTime: true,
    timerInterval: null,
    circumference: 2 * Math.PI * 90,
    currentStudyTime: 0,
    
    // Task data
    newTask: '',
    tasks: [],
    nextTaskId: 1,
    
    // Progress data
    studyRecords: [],
    motivationMessages: [
      "Great start! Keep going and you'll achieve your goals!",
      "Consistency is key. You're doing amazing!",
      "Your progress is impressive. Stay focused!",
      "You're making excellent progress. Keep it up!",
      "Your dedication is inspiring. Continue the great work!"
    ]
  },
  
  computed: {
    timerTypeText() {
      return this.isStudyTime ? 'Study Time' : 'Break Time';
    },
    timerTypeClass() {
      return this.isStudyTime ? 'study-type' : 'break-type';
    },
    activeTasks() {
      return this.tasks.filter(task => !task.completed);
    },
    completedTasks() {
      return this.tasks.filter(task => task.completed).length;
    },
    progressOffset() {
      const totalTime = this.isStudyTime ? this.studyTime * 60 : this.breakTime * 60;
      const progress = this.timerTime / totalTime;
      return this.circumference * (1 - progress);
    },
    dailyMotivation() {
      if (this.tasks.length === 0) {
        return "Add your first task to get started!";
      }
      const completionRate = this.completedTasks / this.tasks.length;
      if (completionRate === 1) {
        return "Perfect day! You completed all tasks. Amazing work!";
      } else if (completionRate >= 0.7) {
        return "Great progress! You're almost done with today's tasks.";
      } else if (completionRate >= 0.4) {
        return "Good job so far! Keep pushing to complete more tasks.";
      } else {
        return "Get started on your tasks. Every small step counts!";
      }
    },
    fullMotivation() {
      if (this.studyRecords.length === 0) {
        return "Complete study sessions to see your progress history!";
      }
      const bestDay = [...this.studyRecords].sort((a, b) => 
        (b.completedTasks / b.totalTasks) - (a.completedTasks / a.totalTasks)
      )[0];
      return `On Day ${bestDay.day}, you completed ${bestDay.completedTasks}/${bestDay.totalTasks} tasks - your best day so far! Keep up the great work!`;
    }
  },
  
  watch: {
    currentDay(newDay) {
      if (newDay > 0) {
        this.loadDayData(newDay);
      }
    },
    studyTime(newVal) {
      if (!this.isRunning && this.isStudyTime) {
        this.timerTime = newVal * 60;
      }
    }
  },
  
  created() {
    if (localStorage.getItem('isLoggedIn')) {
      this.username = localStorage.getItem('username') || '';
      this.studentId = localStorage.getItem('studentId') || '';
      this.profilePic = localStorage.getItem('profilePic') || '';
      this.isLoggedIn = true;
      this.currentDay = parseInt(localStorage.getItem('currentDay') || '1');
      this.loadDayData(this.currentDay);
      this.studyRecords = JSON.parse(localStorage.getItem('studyRecords') || '[]');
      this.getLocation();
    }
  },
  
  methods: {
    login() {
      if (!this.username || !this.studentId) {
        alert('Please enter both username and student ID');
        return;
      }
      this.isLoggedIn = true;
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', this.username);
      localStorage.setItem('studentId', this.studentId);
      this.loadDayData(this.currentDay);
      this.getLocation();
    },
    
    logout() {
      this.isLoggedIn = false;
      this.showSettings = false;
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      localStorage.removeItem('studentId');
      this.pauseTimer();
    },
    
    toggleSettings() {
      this.showSettings = !this.showSettings;
    },
    
    openProgressReport() {
      this.showSettings = false;
      this.showProgressReport = true;
      this.$nextTick(() => {
        this.drawFullProgressChart();
      });
    },
    
    changeDay(delta) {
      this.currentDay += delta;
    },
    
    getLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            this.location = `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`;
          },
          error => {
            console.error('Error getting location:', error);
            this.location = 'Location access denied';
          }
        );
      } else {
        this.location = 'Geolocation not supported';
      }
    },
    
    uploadPhoto() {
      this.$refs.fileInput.click();
      this.showSettings = false;
    },
    
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.profilePic = e.target.result;
          localStorage.setItem('profilePic', this.profilePic);
          alert('Profile picture updated!');
        };
        reader.readAsDataURL(file);
      }
    },
    
    startTimer() {
      if (this.timerInterval) return;
      this.isRunning = true;
      this.timerInterval = setInterval(() => {
        if (this.timerTime > 0) {
          this.timerTime--;
        } else {
          this.timerFinished();
        }
      }, 1000);
    },
    
    pauseTimer() {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.isRunning = false;
    },
    
    resetTimer() {
      this.pauseTimer();
      this.timerTime = this.isStudyTime ? this.studyTime * 60 : this.breakTime * 60;
    },
    
    timerFinished() {
      this.pauseTimer();
      if (this.isStudyTime) {
        this.currentStudyTime += this.studyTime;
        this.saveStudyRecord();
        this.isStudyTime = false;
        this.timerTime = this.breakTime * 60;
      } else {
        this.isStudyTime = true;
        this.timerTime = this.studyTime * 60;
      }
      this.startTimer();
    },
    
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    addTask() {
      if (this.newTask.trim() === '') return;
      this.tasks.push({
        id: this.nextTaskId++,
        text: this.newTask.trim(),
        completed: false
      });
      this.newTask = '';
      this.saveDayData();
    },
    
    completeTask(task) {
      setTimeout(() => {
        task.completed = true;
        this.saveDayData();
      }, 300);
    },
    
    saveDayData() {
      const dayData = {
        day: this.currentDay,
        tasks: this.tasks,
        nextTaskId: this.nextTaskId,
        currentStudyTime: this.currentStudyTime
      };
      localStorage.setItem(`day_${this.currentDay}`, JSON.stringify(dayData));
      localStorage.setItem('currentDay', this.currentDay);
    },
    
    loadDayData(day) {
      const dayData = JSON.parse(localStorage.getItem(`day_${day}`) || 'null');
      if (dayData) {
        this.tasks = dayData.tasks || [];
        this.nextTaskId = dayData.nextTaskId || 1;
        this.currentStudyTime = dayData.currentStudyTime || 0;
      } else {
        this.tasks = [];
        this.nextTaskId = 1;
        this.currentStudyTime = 0;
      }
      this.isStudyTime = true;
      this.timerTime = this.studyTime * 60;
      this.pauseTimer();
      this.$nextTick(() => {
        this.drawDailyChart();
      });
    },
    
    saveStudyRecord() {
      const existingRecord = this.studyRecords.find(r => r.day === this.currentDay);
      if (existingRecord) {
        existingRecord.studyTime += this.studyTime;
        existingRecord.completedTasks = this.completedTasks;
        existingRecord.totalTasks = this.tasks.length;
      } else {
        this.studyRecords.push({
          day: this.currentDay,
          studyTime: this.studyTime,
          completedTasks: this.completedTasks,
          totalTasks: this.tasks.length
        });
      }
      this.studyRecords.sort((a, b) => a.day - b.day);
      localStorage.setItem('studyRecords', JSON.stringify(this.studyRecords));
      this.drawDailyChart();
    },
    
    drawDailyChart() {
      const canvas = this.$refs.dailyChart;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      const completionRate = this.tasks.length ? this.completedTasks / this.tasks.length : 0;
      const barWidth = width * 0.8;
      const barHeight = 15;
      const x = (width - barWidth) / 2;
      const y = height / 2;
      
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#4361ee';
      ctx.fillRect(x, y, barWidth * completionRate, barHeight);
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(completionRate * 100)}% Tasks Completed`, width/2, y - 10);
    },
    
    drawFullProgressChart() {
      const canvas = this.$refs.fullProgressChart;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      if (this.studyRecords.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Complete study sessions to see progress', width/2, height/2);
        return;
      }
      
      const maxStudyTime = Math.max(...this.studyRecords.map(r => r.studyTime), 10);
      const maxTasks = Math.max(...this.studyRecords.map(r => r.totalTasks), 10);
      const margin = { top: 30, right: 30, bottom: 50, left: 60 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = margin.top + (i * chartHeight / 5);
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
      }
      
      const barWidth = chartWidth / (this.studyRecords.length * 2 + 1);
      this.studyRecords.forEach((record, index) => {
        const x = margin.left + (index * 2 + 1) * barWidth;
        const studyHeight = (record.studyTime / maxStudyTime) * chartHeight;
        ctx.fillStyle = '#4361ee';
        ctx.fillRect(x, margin.top + chartHeight - studyHeight, barWidth, studyHeight);
        
        const taskHeight = (record.completedTasks / maxTasks) * chartHeight;
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(x + barWidth, margin.top + chartHeight - taskHeight, barWidth, taskHeight);
        
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Day ${record.day}`, x + barWidth, height - margin.bottom / 2);
      });
    }
  }
});
//SERVICE WORKER REGISTRATION
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swUrl = new URL('sw.js', window.location.href).href;
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('[APP] SW registered:', registration);
        
        // Force update on page reload
        registration.update();
        
        // Track installation state
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[APP] SW update found:', newWorker.state);
          
          newWorker.addEventListener('statechange', () => {
            console.log('[APP] SW state changed:', newWorker.state);
          });
        });
      })
      .catch(err => {
        console.error('[APP] SW registration failed:', err);
      });
  }
}
// Delay registration until page is fully loaded
window.addEventListener('load', () => {
  registerServiceWorker();
});