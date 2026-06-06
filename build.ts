const { build, context } = require("esbuild")
const { resolve } = require("path")
const { existsSync } = require("fs")
const { copy } = require("esbuild-plugin-copy")
const isProd = process.argv.indexOf('--mode=production') >= 0;

const dependencies = ['vscode-html-to-docx', 'highlight.js', 'pdf-lib', 'cheerio', 'katex', 'mustache', 'puppeteer-core']

async function main() {
    const options = {
        entryPoints: ['./src/extension.ts'],
        bundle: true,
        outfile: "out/extension.js",
        external: ['vscode', ...dependencies],
        format: 'cjs',
        platform: 'node',
        // logLevel: 'error',
        metafile: true,
        // sourceRoot: __dirname+"/src",
        minify: isProd,
        sourcemap: !isProd,
        logOverride: {
            'duplicate-object-key': "silent",
            'suspicious-boolean-not': "silent",
        },
        plugins: [
            // 复制生成pdf的静态文件
            copy({
                resolveFrom: 'out',
                assets: {
                    from: ['./template/**/*'],
                    to: ['./'],
                    keepStructure: true
                },
            }),
            copy({
                resolveFrom: 'out',
                assets: {
                    from: ['./node_modules/node-unrar-js/dist/js/unrar.wasm'],
                    to: ['./'],
                    keepStructure: true
                },
            }),
            {
                name: 'build notice',
                setup(build) {
                    build.onStart(() => {
                        console.log('build start')
                    })
                    build.onEnd(() => {
                        console.log('build success')
                    })
                }
            },
        ],
    }

    if (isProd) {
        await build(options)
        return
    }

    const buildContext = await context(options)
    await buildContext.watch()
}

async function createLib() {
    const points = dependencies.reduce((point, dependency) => {
        const main = require(`./node_modules/${dependency}/package.json`).main ?? "index.js";
        const mainAbsPath = resolve(`./node_modules/${dependency}`, main);
        if (existsSync(mainAbsPath)) {
            point[dependency] = mainAbsPath;
        }
        return point;
    }, {})
    await build({
        entryPoints: points,
        bundle: true,
        outdir: "out/node_modules",
        format: 'cjs',
        platform: 'node',
        minify: true,
        treeShaking: true,
        metafile: true
    })
}

Promise.all([createLib(), main()]).catch(error => {
    console.error(error)
    process.exitCode = 1
});
