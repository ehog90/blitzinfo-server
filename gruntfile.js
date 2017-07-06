module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ts: {
            default : {
                tsconfig:'tsconfig.json',
                src: [
                    'node_modules/@types',
                    'scripts/**/*.ts',
                    "!node_modules/**",
                    'app.ts']
            },
        },
        copy: {
            default: {
                files: [
                    {
                        src:
                            [
                                'public/**/*.webp',
                                'public/**/*.png',
                                'scripts/**/*.json',
                                'scripts/**/*.js',
                                'changed-modules/**/*.js',
                                'static-json-data/**/*.json',
                                '*.json',
                            ],
                        dest: 'dist/'},
                ]
            },
            fast: {
                files: [
                    {
                        src:
                            [
                                'public/**/*.png',
                                'scripts/**/*.json',
                                'scripts/**/*.js',
                                'changed-modules/**/*.js',
                                'static-json-data/**/*.json',
                                '*.json',
                            ],
                        dest: 'dist/'},
                ]
            }
        },
        clean: {
            default: [
                'dist',
                'scripts/**/*.js',
                'scripts/**/*.js.map',
                'app.js','app.js.map']
        }
    });

    grunt.registerTask(
        'default',
        ['clean','ts','copy']);
    grunt.registerTask(
        'fast',
        ['ts','copy:fast']
    )

};