import { TypstProject } from "@vedivad/codemirror-typst"

const TypstPreviewer = {
  pagesVnodes: [],
  isLoading: true,

  // Get pages as vdom-nodes
  async getTypstPreviewNodes(project, result) {
    console.log('result.pages.length', result.pages.length)
    const pages = await project.renderedPages(0, result.pages.length)
    return pages.map(p => 
      m('div.typst-page', m.trust(p.svg))
    )
  },

  async oninit(vnode) {
    const component = vnode.state
    const content = vnode.attrs.content
    console.log('content', content)

    try {
      const project = await TypstProject.create({
        entry: '/main.typ'
      });
      await project.setText('/main.typ', content);

      project.onCompile(async (result) => {
        component.pagesVnodes = await component.getTypstPreviewNodes(project, result);
        console.log('component.pagesVnodes', component.pagesVnodes)
        component.isLoading = false;
        m.redraw(); // Force Mithril to redraw after async update
      });

      await project.compile();

    } catch (error) {
      console.error("Couldn't load Typst-document:", error);
      component.isLoading = false;
      m.redraw();
    }
  },

  view(vnode) {
    const component = vnode.state;

    return m('div#preview',
      component.isLoading ? m('p', 'Laster Typst-kompilator...')
      : component.pagesVnodes.length > 0 ? component.pagesVnodes
      : m('p', 'Ingen sider å vise.')
    );
  }
};

export default TypstPreviewer
