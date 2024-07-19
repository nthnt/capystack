import restart from 'vite-plugin-restart'

export default {
    root: 'src/',
    publicDir: '../static/',
    server:
    {
        host: true
    },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true, 
        sourcemap: true
    },
    plugins:
    [
        restart({ restart: [ '../static/**', ] })
    ],
}
