/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { syncBusinessPlan, requestBusinessReview } from './business-review.mjs';
import { BackgroundRequest } from './background.mjs';
import { autoSave } from './autosave.mjs';
import { renderPlanResult } from './plan-result.mjs';
import { PlanCandidate } from './plan-candidate.mjs';
import { PlanSession } from './plan.mjs';
import { DocumentError } from './errors.mjs';
import { Requirements } from './requirements.mjs';
export async function mountPlanning(bridge, workflow) {
  const project = await bridge.request('GET', '/project');
  if (!project.ok) throw new DocumentError(project);
  const taskKey = 'bid-plan-task:' + project.body.projectId;
  let taskId = sessionStorage.getItem(taskKey),
    timer;
  const source = new Requirements(bridge);
  await source.load();
  const plan = new PlanSession(bridge);
  await plan.load();
  const candidate = new PlanCandidate(bridge);
  await candidate.load();
  if (plan.value.approved) {
    const current = new Requirements(bridge);
    await current.load();
    if (
      current.revision !== plan.value.requirementsRevision ||
      current.rows.some((r) => !r.confirmed)
    )
      plan.value.approved = false;
  }
  const panel = document.createElement('section');
  panel.id = 'planning-panel';
  panel.hidden = true;
  panel.className = 'requirements-panel';
  document.querySelector('main').append(panel);
  const bg = new BackgroundRequest(bridge, 'bid_plan_request');
  await bg.load();
  if (bg.value) {
    sessionStorage.removeItem(taskKey);
    taskId = null;
  }
  const saver = autoSave(() => plan.save(), {
    onState: (state, e) => {
      if (state === 'saved') {
        say.textContent = '\u89c4\u5212\u5df2\u81ea\u52a8\u4fdd\u5b58';
        updateTaskSummary();
      }
      if (state === 'error') say.textContent = e.message;
    },
  });
  let lastEdit;
  const say = document.createElement('p');
  say.setAttribute('role', 'status');
  const form = document.createElement('div');
  form.className = 'plan-fields';
  panel.append(form);
  const controls = {};
  const fields = [
    ['pages', '\u76ee\u6807\u9875\u6570\uff08\u4f30\u7b97\uff09', null],
    [
      'figures',
      '\u914d\u56fe\u7b56\u7565',
      [
        ['none', '\u4e0d\u914d\u56fe'],
        ['selective', '\u6309\u9700\u914d\u56fe'],
        ['rich', '\u4e30\u5bcc\u914d\u56fe'],
      ],
    ],
    [
      'mode',
      '\u7f16\u5199\u6a21\u5f0f',
      [
        ['metrics', '\u53ea\u5199\u6307\u6807'],
        ['providers', '\u6307\u6807\u4e0e\u4f9b\u5e94\u5546'],
      ],
    ],
    ['providers', '\u4f9b\u5e94\u5546\u9009\u9879', null],
    [
      'quality',
      '\u8d28\u91cf\u8981\u6c42',
      [
        ['very-high', '\u5f88\u9ad8'],
        ['high', '\u8f83\u9ad8'],
        ['normal', '\u666e\u901a'],
      ],
    ],
    [
      'volume',
      '\u5185\u5bb9\u8303\u56f4',
      [
        ['combined', '\u7efc\u5408\u6807'],
        ['technical', '\u6280\u672f\u6807'],
        ['commercial', '\u5546\u52a1\u6807'],
      ],
    ],
  ];
  for (const [key, label, options] of fields) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    const el = document.createElement(options ? 'select' : 'input');
    el.id = 'plan-' + key;
    if (options)
      for (const [value, text] of options) {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = text;
        el.append(o);
      }
    else if (key === 'pages') {
      el.type = 'number';
      el.min = 1;
      el.max = 3000;
    }
    el.value = plan.value[key];
    el.oninput = () => {
      plan.change(key, key === 'pages' ? Number(el.value) : el.value);
      controls.providers.parentElement.hidden = plan.value.mode === 'metrics';
      render();
    };
    wrap.append(el);
    form.append(wrap);
    controls[key] = el;
  }
  const templateLabel = document.createElement('label');
  templateLabel.textContent = '\u6392\u7248\u6a21\u677f';
  const templateSelect = document.createElement('select');
  templateSelect.setAttribute('aria-label', '\u6392\u7248\u6a21\u677f');
  const unset = document.createElement('option');
  unset.value = '';
  unset.textContent = '\u672a\u9009\u62e9\u6a21\u677f';
  templateSelect.append(unset);
  const templateHelp = document.createElement('p');
  templateHelp.textContent =
    '\u5728\u9879\u76ee\u8bbe\u7f6e\u7684\u8d44\u6599\u4e2d\u5bfc\u5165 DOCX\uff0c\u6b64\u5904\u9501\u5b9a\u5176\u6587\u4ef6\u7248\u672c\u3002\u6a21\u677f\u6392\u7248\u6821\u9a8c\u5728\u6210\u679c\u5bfc\u51fa\u73af\u8282\u5b8c\u6210\u3002';
  const imported = await bridge.request('GET', '/files');
  if (!imported.ok) {
    templateHelp.textContent =
      '\u6a21\u677f\u5217\u8868\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u9875\u9762\u91cd\u8bd5';
  }
  const templates = imported.ok ? imported.body.items.filter((f) => /\.docx$/i.test(f.name)) : [];
  for (const f of templates) {
    const option = document.createElement('option');
    option.value = f.id;
    option.textContent = f.name + ' \u00b7 ' + f.hash.slice(0, 8);
    templateSelect.append(option);
  }
  if (
    plan.value.template &&
    !templates.some((f) => f.id === plan.value.template.id && f.hash === plan.value.template.hash)
  ) {
    const missing = document.createElement('option');
    missing.value = plan.value.template.id;
    missing.textContent = plan.value.template.name + ' \u00b7 \u6587\u4ef6\u4e0d\u53ef\u7528';
    templateSelect.append(missing);
  }
  templateSelect.value = plan.value.template?.id || '';
  templateSelect.onchange = () => {
    const f = templates.find((f) => f.id === templateSelect.value);
    plan.change('template', f ? { id: f.id, name: f.name, hash: f.hash } : null);
    render();
  };
  templateLabel.append(templateSelect);
  form.append(templateLabel);
  panel.append(templateHelp);
  controls.template = templateSelect;
  controls.providers.parentElement.hidden = plan.value.mode === 'metrics';
  const note = document.createElement('p');
  note.textContent =
    '\u76ee\u5f55\u521d\u7a3f\u6309\u5df2\u786e\u8ba4\u9700\u6c42\u5206\u7ec4\uff0c\u6bcf\u7ae0\u6700\u591a 8 \u9879\u9700\u6c42\uff0c\u53ef\u4fee\u6539\u7ae0\u540d\u540e\u786e\u8ba4\u3002\u667a\u80fd\u89c4\u5212\u9700\u5ba1\u6838\u6a21\u578b\u7ed3\u679c\uff1b\u9875\u6570\u4ee5\u5b9e\u9645\u8bd5\u6392\u4e3a\u51c6\u3002';
  panel.append(note);
  const actions = document.createElement('div');
  actions.className = 'toolbar';
  panel.append(actions);
  const list = document.createElement('div');
  panel.append(list, say);
  const comparison = document.createElement('section');
  comparison.className = 'plan-comparison';
  panel.insertBefore(comparison, list);
  let locked = false,
    operation = '';
  async function poll() {
    try {
      if (bg.value?.reviewMode === 'business' && !bg.value.applied) {
        const outcome = await syncBusinessPlan(bg, plan, candidate, await matrix());
        taskId = outcome.applied ? null : outcome.job.id;
        locked = !!taskId && !outcome.review;
        render();
        if (outcome.applied) {
          await workflow.mark('planning', true);
          say.textContent = '\u76ee\u5f55\u5df2\u786e\u8ba4\u5e76\u4fdd\u5b58';
          return;
        }
        say.textContent = outcome.review
          ? '\u76ee\u5f55\u5019\u9009\u5df2\u4fdd\u5b58\uff0c\u67e5\u770b\u540e\u786e\u8ba4\u91c7\u7528'
          : '\u667a\u80fd\u4f53\u6b63\u5728\u540e\u53f0\u89c4\u5212';
        timer = setTimeout(poll, 2500);
        return;
      }
      if (bg.value && !bg.value.applied) {
        const job = await bg.sync(),
          step = job.steps[0];
        taskId = step.taskInstanceId || job.id;
        if (step.state === 'done') {
          const result = await bg.result(step);
          taskId = null;
          if (!result?.verified) {
            taskId = null;
            throw new Error(
              '\u89c4\u5212\u7ed3\u679c\u672a\u901a\u8fc7\u6821\u9a8c\uff0c\u539f\u7ed3\u679c\u5df2\u4fdd\u7559\uff0c\u8bf7\u91cd\u65b0\u89c4\u5212',
            );
          }
          const pinned = bg.value.spec.sources.find((s) => s.id === 'bid_plan').revision;
          if (plan.dirty || plan.revision !== pinned)
            throw new Error('Planning changed; saved model result preserved');
          await candidate.stage(result.content.proposal_generation, plan, await matrix());
          bg.value.applied = true;
          await bg.save();
          sessionStorage.removeItem(taskKey);
          taskId = null;
          locked = false;
          render();
          say.textContent = '\u76ee\u5f55\u5019\u9009\u5df2\u81ea\u52a8\u4fdd\u5b58';
          return;
        }
        if (['error', 'cancelled'].includes(job.state)) {
          taskId = null;
          throw new Error(
            job.error || '\u89c4\u5212\u5df2\u53d6\u6d88\uff0c\u53ef\u91cd\u65b0\u53d1\u8d77',
          );
        }
        say.textContent =
          '\u667a\u80fd\u89c4\u5212\u6b63\u5728\u540e\u53f0\u6267\u884c\uff0c\u7ed3\u679c\u4f1a\u81ea\u52a8\u4fdd\u5b58\u3002';
        timer = setTimeout(poll, 2500);
        return;
      }
      const r = await bridge.request('GET', '/tasks');
      if (!r.ok) throw new DocumentError(r);
      const task = r.body.items.find((t) => t.id === taskId);
      if (!task) throw new Error('Planning task unavailable');
      if (task.hasResult) {
        const result = await bridge.request('GET', '/tasks/' + taskId + '/result');
        if (!result.ok) throw new DocumentError(result);
        if (plan.dirty)
          throw new Error('Local plan changed; save or reconcile before adopting result');
        const latest = new PlanSession(bridge);
        await latest.load();
        if (latest.revision !== plan.revision)
          throw new Error('Saved plan changed in another window; reopen before adopting');
        await candidate.stage(result.body.content.proposal_generation, plan, await matrix());
        sessionStorage.removeItem(taskKey);
        taskId = null;
        locked = false;
        render();
        say.textContent =
          '\u6a21\u578b\u76ee\u5f55\u5df2\u751f\u6210\uff0c\u8bf7\u6838\u5bf9\u540e\u786e\u8ba4';
        return;
      }
      if (['failed', 'cancelled', 'rejected'].includes(task.state)) {
        sessionStorage.removeItem(taskKey);
        taskId = null;
        throw new Error('Planning task ' + task.state + '; inspect runtime task record');
      }
      say.textContent =
        '\u76ee\u5f55\u89c4\u5212\uff1a' +
        task.state +
        ' \u00b7 \u8bf7\u5728 RUYIN \u5f85\u529e\u4e2d\u5904\u7406\u8d44\u6599\u548c\u6210\u679c\u5ba1\u6838';
      timer = setTimeout(poll, 2500);
    } catch (e) {
      if (bg.job && ['completed', 'error', 'cancelled'].includes(bg.job.state)) taskId = null;
      locked = false;
      say.textContent = e.message;
      render();
    }
  }
  const model = document.createElement('button');
  model.textContent = '\u667a\u80fd\u89c4\u5212\u76ee\u5f55';
  model.onclick = () =>
    run(async () => {
      if (taskId) {
        locked = true;
        void poll();
        return;
      }
      if (plan.dirty) await plan.save();
      const context = plan.context(await matrix());
      const existing = await bridge.request('GET', '/documents/bid_plan_context');
      if (!existing.ok && existing.status !== 404) throw new DocumentError(existing);
      const saved = await bridge.request('PUT', '/documents/bid_plan_context', {
        markdown: JSON.stringify(context, null, 2),
        revision: existing.ok ? existing.body.revision : 0,
      });
      if (!saved.ok) throw new DocumentError(saved);
      const job = await bg.start(
        {
          id: crypto.randomUUID(),
          label: 'Bid outline planning',
          sources: [
            { id: 'bid_plan', revision: plan.revision },
            { id: 'bid_requirements', revision: context.requirementsRevision },
          ],
          steps: [
            {
              id: 'outline',
              taskId: 'plan_outline',
              context: { id: 'bid_plan_context', markdown: JSON.stringify(context) },
            },
          ],
        },
        { reviewMode: 'business' },
      );
      taskId = job.id;
      await workflow.mark('planning', false, true);
      void poll();
    });
  actions.append(model);
  async function matrix() {
    const m = new Requirements(bridge);
    await m.load();
    return m;
  }
  async function run(fn) {
    if (locked) return;
    locked = true;
    operation =
      fn === confirmCurrent
        ? '\u6b63\u5728\u4fdd\u5b58\u65b9\u6848\u2026'
        : '\u6b63\u5728\u5904\u7406\u2026';
    render();
    try {
      await saver.flush();
      await fn();
      if (!taskId) say.textContent = '\u64cd\u4f5c\u5df2\u5b8c\u6210';
    } catch (e) {
      say.textContent =
        e.status === 409
          ? '\u4fdd\u5b58\u51b2\u7a81\uff1a\u672c\u5730\u4fee\u6539\u5df2\u4fdd\u7559\uff0c\u8bf7\u590d\u5236\u76ee\u5f55\u540e\u91cd\u65b0\u6253\u5f00\u5408\u5e76'
          : e.message;
    } finally {
      locked = !!taskId && !candidate.value?.review;
      render();
    }
  }
  for (const [text, fn] of [
    ['\u65b0\u589e\u7ae0\u8282', () => plan.add()],
    ['\u4fdd\u5b58\u89c4\u5212', () => plan.save()],
    [
      '\u751f\u6210\u76ee\u5f55\u521d\u7a3f',
      async () => {
        if (plan.value.outline.length)
          throw new Error(
            '\u5df2\u6709\u76ee\u5f55\uff0c\u8bf7\u4fee\u6539\u73b0\u6709\u7ae0\u540d\uff1b\u672c\u6b21\u4e0d\u8986\u76d6\u3002',
          );
        plan.build(await matrix());
        await workflow.mark('planning');
      },
    ],
    [
      '\u786e\u8ba4\u76ee\u5f55\u5e76\u4fdd\u5b58',
      async () => {
        if (plan.value.template) {
          const files = await bridge.request('GET', '/files');
          if (!files.ok) throw new DocumentError(files);
          if (
            !files.body.items.some(
              (f) => f.id === plan.value.template.id && f.hash === plan.value.template.hash,
            )
          )
            throw new Error('Selected template is unavailable; select an imported version');
        }
        plan.approve(await matrix());
        await plan.save();
        await workflow.mark('planning', true);
      },
    ],
  ]) {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = () => run(fn);
    actions.append(b);
  }
  const taskSummary = document.createElement('p');
  taskSummary.className = 'plan-task-summary';
  panel.insertBefore(taskSummary, comparison);

  const text = (tag, value, cls) => {
    const e = document.createElement(tag);
    e.textContent = value;
    if (cls) e.className = cls;
    return e;
  };
  panel.classList.add('planning-studio');
  const hero = document.createElement('div');
  hero.className = 'planning-hero';
  hero.append(
    text('p', '\u667a\u80fd\u4f53\u7f16\u5199\u89c4\u5212', 'section-label'),
    text('h2', '\u7f16\u5199\u89c4\u5212'),
    text(
      'p',
      '\u4ece\u5df2\u786e\u8ba4\u7684\u62db\u6807\u9700\u6c42\u51fa\u53d1\uff0c\u751f\u6210\u7ae0\u8282\u76ee\u5f55\u3001\u9700\u6c42\u8986\u76d6\u4e0e\u5206\u6279\u7f16\u5199\u5b89\u6392\u3002',
      'muted',
    ),
  );
  const delivery = document.createElement('div');
  delivery.className = 'planning-delivery';
  delivery.append(
    text('span', '01 \u9700\u6c42\u5df2\u786e\u8ba4'),
    text('span', '02 \u667a\u80fd\u89c4\u5212'),
    text('span', '03 \u786e\u8ba4\u540e\u5206\u7ae0\u7f16\u5199'),
  );
  delivery.append(taskSummary);
  const composer = document.createElement('aside');
  composer.className = 'planning-composer';
  composer.append(text('h2', '\u544a\u8bc9\u667a\u80fd\u4f53\u600e\u4e48\u5199'));
  const briefLabel = document.createElement('label');
  briefLabel.textContent = '\u672c\u6b21\u7f16\u5199\u610f\u56fe';
  const brief = document.createElement('textarea');
  brief.id = 'plan-brief';
  brief.maxLength = 4000;
  brief.rows = 5;
  brief.value = plan.value.brief || '';
  brief.placeholder =
    '\u4f8b\u5982\uff1a\u7a81\u51fa\u6570\u636e\u5b89\u5168\u4e0e\u8fd0\u7ef4\u4fdd\u969c\uff0c\u6280\u672f\u65b9\u6848\u8981\u843d\u5230\u5b9e\u65bd\u6b65\u9aa4\uff0c\u5546\u52a1\u90e8\u5206\u7b80\u6d01\u5b8c\u6574\u3002';
  brief.oninput = () => {
    plan.change('brief', brief.value);
    saver.change();
    updateTaskSummary();
  };
  briefLabel.append(brief);
  controls.brief = brief;
  const constraints = document.createElement('details');
  constraints.className = 'plan-constraints';
  constraints.append(
    text('summary', '\u7f16\u5199\u76ee\u6807\u4e0e\u4ea4\u4ed8\u7ea6\u675f'),
    form,
    templateHelp,
  );
  note.textContent =
    '\u667a\u80fd\u4f53\u8d1f\u8d23\u76ee\u5f55\u548c\u4efb\u52a1\u62c6\u5206\u3002\u4f60\u53ef\u4ee5\u8865\u5145\u610f\u56fe\u540e\u91cd\u65b0\u89c4\u5212\uff0c\u786e\u8ba4\u524d\u4e0d\u4f1a\u66ff\u6362\u73b0\u6709\u65b9\u6848\u3002\u76ee\u6807\u9875\u6570\u4ee5\u6700\u7ec8\u6392\u7248\u4e3a\u51c6\u3002';
  const confirmShortcut = text(
    'button',
    '\u786e\u8ba4\u65b9\u6848\u5e76\u9501\u5b9a\u8ba1\u5212',
    'primary',
  );
  confirmShortcut.onclick = () => run(confirmCurrent);
  composer.append(briefLabel, constraints, confirmShortcut, model, note, say);
  const grid = document.createElement('div');
  grid.className = 'planning-studio-grid';
  grid.append(comparison, composer);
  const manual = document.createElement('details');
  manual.className = 'plan-manual';
  manual.append(
    text('summary', '\u9700\u8981\u65f6\u624b\u5de5\u5fae\u8c03\u76ee\u5f55'),
    text(
      'p',
      '\u4ec5\u5728\u667a\u80fd\u89c4\u5212\u7ed3\u679c\u9700\u8981\u5c40\u90e8\u4fee\u6b63\u65f6\u4f7f\u7528\u3002\u4fee\u6539\u540e\u9700\u8981\u91cd\u65b0\u786e\u8ba4\u3002',
      'muted',
    ),
    actions,
    list,
  );
  actions.lastElementChild.remove();
  panel.replaceChildren(hero, delivery, grid, manual);
  async function confirmCurrent() {
    if (candidate.value?.review) {
      if (candidate.value.review.invalid)
        throw new Error(
          '\u6b64\u5019\u9009\u5df2\u4e0d\u53ef\u91c7\u7528\uff0c\u8bf7\u91cd\u65b0\u89c4\u5212',
        );
      requestBusinessReview(bridge, candidate.value.review.taskInstanceId);
      return;
    }
    if (plan.value.template) {
      const files = await bridge.request('GET', '/files');
      if (!files.ok) throw new DocumentError(files);
      if (
        !files.body.items.some(
          (f) => f.id === plan.value.template.id && f.hash === plan.value.template.hash,
        )
      )
        throw new Error('Selected template is unavailable; select an imported version');
    }
    const m = await matrix();
    if (candidate.value) await candidate.accept(plan, m);
    plan.approve(m);
    await plan.save();
    await source.load();
    await workflow.mark('planning', true);
  }
  function updateTaskSummary() {
    let chapters = plan.value.outline;
    if (candidate.value)
      try {
        chapters = candidate.preview(plan, source);
      } catch {}
    taskSummary.textContent =
      (candidate.value ? '\u65b0\u65b9\u6848' : '\u5f53\u524d\u65b9\u6848') +
      ' \u00b7 ' +
      chapters.length +
      ' \u7ae0 \u00b7 \u8986\u76d6 ' +
      new Set(chapters.flatMap((c) => c.requirementIds)).size +
      ' \u9879\u9700\u6c42 \u00b7 ' +
      (candidate.value
        ? '\u5f85\u786e\u8ba4\u65b0\u65b9\u6848'
        : plan.value.approved && !plan.dirty
          ? '\u5df2\u786e\u8ba4'
          : plan.dirty
            ? '\u76ee\u6807\u6709\u4fee\u6539'
            : '\u5f85\u786e\u8ba4');
    delivery.firstElementChild.textContent =
      source.rows.length && source.rows.every((r) => r.confirmed)
        ? '01 \u9700\u6c42\u5df2\u786e\u8ba4'
        : '01 \u9700\u6c42\u5f85\u786e\u8ba4';
    confirmShortcut.hidden = !candidate.value;
    confirmShortcut.disabled =
      locked ||
      !!candidate.value?.review?.invalid ||
      plan.dirty ||
      candidate.value?.planRevision !== plan.revision;
  }
  function render() {
    if (plan.dirty && !locked) {
      let key;
      try {
        key = plan.encode();
      } catch {}
      if (key && key !== lastEdit) {
        lastEdit = key;
        saver.change();
      }
    }
    updateTaskSummary();
    renderPlanResult(comparison, {
      plan,
      candidate,
      matrix: source,
      locked,
      confirm: () => run(confirmCurrent),
      discard: () =>
        run(() =>
          candidate.value?.review && !candidate.value.review.invalid
            ? requestBusinessReview(bridge, candidate.value.review.taskInstanceId)
            : candidate.put(null),
        ),
    });
    list.replaceChildren();
    for (const task of plan.tasks()) {
      const row = document.createElement('section');
      row.className = 'plan-chapter';
      const title = document.createElement('input');
      title.disabled = locked || !!taskId;
      title.value = task.title;
      title.maxLength = 100;
      title.setAttribute('aria-label', 'Chapter ' + task.batch);
      title.oninput = () => {
        plan.value.outline.find((c) => c.id === task.id).title = title.value;
        plan.value.approved = false;
        saver.change();
        updateTaskSummary();
        workflow.states.planning = 'active';
        workflow.emit();
        say.textContent = '\u76ee\u5f55\u5df2\u4fee\u6539\uff0c\u9700\u91cd\u65b0\u786e\u8ba4';
      };
      const meta = document.createElement('span');
      meta.textContent =
        '\u6279\u6b21 ' +
        task.batch +
        ' \u00b7 ' +
        task.requirementIds.length +
        ' \u9879\u9700\u6c42 \u00b7 \u5f85\u7f16\u5199';
      row.append(title, meta);
      const buttons = document.createElement('div');
      buttons.className = 'toolbar';
      for (const [label, fn, disabled] of [
        ['\u4e0a\u79fb', () => plan.move(task.id, -1), task.batch === 1],
        ['\u4e0b\u79fb', () => plan.move(task.id, 1), task.batch === plan.value.outline.length],
        ['\u5220\u9664\u7ae0\u8282', () => plan.remove(task.id), false],
      ]) {
        const b = document.createElement('button');
        b.textContent = label;
        b.disabled = disabled || locked || !!taskId;
        b.onclick = () => {
          fn();
          render();
        };
        buttons.append(b);
      }
      row.append(buttons);
      const detail = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent =
        '\u5173\u8054\u9700\u6c42\uff08' + task.requirementIds.length + '\uff09';
      detail.append(summary);
      for (const req of source.rows.filter(
        (r) => plan.value.volume === 'combined' || r.category === plan.value.volume,
      )) {
        const label = document.createElement('label');
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.disabled = locked || !!taskId;
        check.checked = task.requirementIds.includes(req.id);
        check.onchange = () => {
          try {
            plan.assign(task.id, req.id, check.checked);
            render();
          } catch (e) {
            check.checked = !check.checked;
            say.textContent = e.message;
          }
        };
        label.append(check, document.createTextNode(req.text));
        detail.append(label);
      }
      row.append(detail);
      list.append(row);
    }
    say.dataset.approved = String(plan.value.approved);
    workflow.states.planning =
      locked || candidate.value
        ? 'active'
        : plan.value.approved && !plan.dirty
          ? 'complete'
          : plan.revision || plan.value.outline.length
            ? 'active'
            : 'pending';
    workflow.emit();
    for (const b of actions.children) b.disabled = locked || !!taskId;
    model.disabled = locked || !!taskId;
    model.className = candidate.value ? 'quiet' : 'primary';
    model.textContent = locked
      ? taskId
        ? '\u667a\u80fd\u4f53\u6b63\u5728\u89c4\u5212\u2026'
        : operation
      : plan.value.outline.length || candidate.value
        ? '\u6309\u65b0\u8981\u6c42\u91cd\u65b0\u89c4\u5212'
        : '\u8ba9\u667a\u80fd\u4f53\u751f\u6210\u89c4\u5212';
    for (const el of Object.values(controls)) el.disabled = locked || !!taskId;
  }
  let planningVisible = false;
  bridge.onStage(async (section) => {
    const next = section === 'planning';
    if (next === planningVisible) return;
    planningVisible = next;
    if (!next) return;
    try {
      await source.load();
      if (plan.value.approved && source.revision !== plan.value.requirementsRevision) {
        plan.value.approved = false;
        say.textContent =
          '\u9700\u6c42\u5df2\u66f4\u65b0\uff0c\u8bf7\u6838\u5bf9\u76ee\u5f55\u5173\u8054\u5e76\u91cd\u65b0\u786e\u8ba4';
      }
      render();
    } catch (e) {
      say.textContent = e.message;
    }
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    void saver.flush().catch(() => {});
  });
  window.addEventListener('beforeunload', (e) => {
    try {
      if (plan.dirty) {
        e.preventDefault();
        }
    } catch {
      e.preventDefault();
    }
  });
  render();
  say.textContent = plan.value.approved
    ? '\u65b9\u6848\u5df2\u786e\u8ba4\u5e76\u4fdd\u5b58'
    : candidate.value
      ? '\u65b0\u65b9\u6848\u5df2\u751f\u6210\uff0c\u6838\u5bf9\u540e\u786e\u8ba4\u5373\u53ef'
      : plan.value.outline.length
        ? '\u5f53\u524d\u76ee\u5f55\u5c1a\u672a\u786e\u8ba4\uff0c\u53ef\u8ba9\u667a\u80fd\u4f53\u91cd\u65b0\u89c4\u5212'
        : '\u8865\u5145\u7f16\u5199\u610f\u56fe\uff0c\u667a\u80fd\u4f53\u5c06\u751f\u6210\u7b2c\u4e00\u7248\u89c4\u5212';
  if ((bg.value && !bg.value.applied) || taskId) {
    locked = true;
    render();
    void poll();
  }
  return plan;
}
