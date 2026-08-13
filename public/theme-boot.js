(function () {
  try {
    var mode = localStorage.getItem('cloodsy_theme_mode')
    var dark =
      mode === 'dark' ||
      (mode !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    var theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  } catch (e) {}
})()
