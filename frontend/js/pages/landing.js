function goToUserPortal(tab = 'login') {
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    window.location.href = 'pages/user/dashboard.html';
    return;
  }
  window.location.href = `pages/auth/auth.html?tab=${tab}`;
}

function goToAdminPortal() {
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    const u = Auth.getUser();
    if (u && (u.role === 'SUPER_ADMIN' || u.role === 'admin')) {
      window.location.href = 'pages/admin/dashboard.html';
      return;
    } else {
      alert('Access Denied: Only Super Admins can access this Control Console. Team Admins and members do not have permission.');
      window.location.href = 'pages/user/dashboard.html';
      return;
    }
  }
  window.location.href = 'pages/auth/auth.html?redirect=admin';
}

window.addEventListener('scroll', () => {
  const nb = document.querySelector('.navbar');
  if (nb) {
    if (window.scrollY > 20) {
      nb.style.background = 'rgba(6,6,15,0.95)';
    } else {
      nb.style.background = 'rgba(6,6,15,0.8)';
    }
  }
});

setTimeout(() => {
  document.querySelectorAll('.feature-card, .step').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}, 300);
