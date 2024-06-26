const path = require('node:path')
const fs = require('node:fs/promises')

const svgr = require('@svgr/core').default
const { icons } = require('feather-icons')
const toPascalCase = require('to-pascal-case')
const globby = require('globby')

async function writeIcons () {
  let iconOutDir = path.join(__dirname, 'src', 'icons')

  await fs.mkdir(iconOutDir, { recursive: true })
  let names = []
  await Promise.all(
    Object.keys(icons).map(async key => {
      let name = `${toPascalCase(key)}Icon`
      let code = await svgr(
        icons[key].toSvg(),
        {
          icon: true,
          typescript: true,
          template: function ({ template, types }, opts, { imports, componentName, jsx }) {
            const t = types
            const plugins = ['jsx']
            if (opts.typescript) {
              plugins.push('typescript')
            }
            const typeScriptTpl = template.smart({ plugins })
            return typeScriptTpl.ast`
            ${imports}

            import { createIcon } from '../Icon'

            export const ${componentName} = createIcon(
              ${
                jsx.children.length === 1
                  ? jsx.children[0]
                  : t.jsxElement(
                      t.jsxOpeningElement(t.jsxIdentifier('React.Fragment'), []),
                      t.jsxClosingElement(t.jsxIdentifier('React.Fragment')),
                      jsx.children
                    )
              },
              ${t.stringLiteral(name)}
            )
            `
          },
          plugins: [
            '@svgr/plugin-jsx',
          ],
        },
        { componentName: name }
      )
      await fs.writeFile(path.join(iconOutDir, `${name}.tsx`), code)
      names.push(name)
    })
  )
  return names
}

async function writeIndex (icons) {
  const index =
    `export type { IconProps } from './Icon';\n\n` +
    icons.map(icon => `export { ${icon} } from './icons/${icon}';`).join('\n') +
    `\n`

  await fs.writeFile('src/index.tsx', index, {
    encoding: 'utf8',
  })

  console.info('✅ Index file written successfully')
}

async function writePkg (pkgPath, content) {
  await fs.mkdir(path.dirname(pkgPath), { recursive: true })
  await fs.writeFile(pkgPath, JSON.stringify(content, null, 2) + '\n', {
    encoding: 'utf8',
  })
}

async function createEntrypointPkgJsons (icons) {
  await Promise.all(
    icons.map(async icon => {
      const pkgPath = path.join(process.cwd(), 'icons', icon, 'package.json')

      await writePkg(pkgPath, {
        main: 'dist/icons.cjs.js',
        module: 'dist/icons.esm.js',
      })
    })
  )

  console.info('✅ all package.json entrypoint files written successfully')
}

async function clean () {
  let pathnames = await globby(['icons/*', 'src/icons/*'], {
    expandDirectories: false,
    onlyFiles: false,
  })
  await Promise.all(
    pathnames.map(async pathname => {
      await fs.remove(pathname)
    })
  )
}

(async () => {
  console.info('🧹 Cleaning existing exports')
  await clean()
  console.info('🚧 Building icon exports')

  let icons = await writeIcons()
  await Promise.all([writeIndex(icons), createEntrypointPkgJsons(icons)])
})()
