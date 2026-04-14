// ASTRION OS — Recipe Book
import { processManager } from '../kernel/process-manager.js';

export function registerRecipeBook() {
  processManager.register('recipe-book', {
    name: 'Recipe Book',
    icon: '🍳',
    singleInstance: true,
    width: 520,
    height: 600,
    launch: (el) => initRecipeBook(el)
  });
}

function initRecipeBook(container) {
  const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drink'];
  const SAMPLE_RECIPES = [
    { id: 1, name: 'Pancakes', category: 'Breakfast', emoji: '🥞', time: '20 min',
      ingredients: ['2 cups flour', '2 eggs', '1.5 cups milk', '2 tbsp sugar', '1 tsp baking powder', 'Butter'],
      steps: ['Mix dry ingredients', 'Whisk eggs and milk together', 'Combine wet and dry', 'Cook on buttered griddle until golden'] },
    { id: 2, name: 'Pasta Carbonara', category: 'Dinner', emoji: '🍝', time: '25 min',
      ingredients: ['400g spaghetti', '200g pancetta', '4 egg yolks', '100g parmesan', 'Black pepper'],
      steps: ['Cook pasta al dente', 'Fry pancetta until crispy', 'Mix egg yolks with parmesan', 'Toss hot pasta with pancetta, then egg mixture off heat'] },
    { id: 3, name: 'Smoothie Bowl', category: 'Breakfast', emoji: '🥣', time: '10 min',
      ingredients: ['1 frozen banana', '1 cup berries', '½ cup yogurt', 'Granola', 'Honey'],
      steps: ['Blend banana, berries, and yogurt until thick', 'Pour into bowl', 'Top with granola, sliced fruit, honey'] },
    { id: 4, name: 'Grilled Cheese', category: 'Lunch', emoji: '🧀', time: '10 min',
      ingredients: ['2 slices bread', 'Cheddar cheese', 'Butter'],
      steps: ['Butter bread on outside', 'Place cheese between slices', 'Grill on medium until golden and melted'] },
    { id: 5, name: 'Chocolate Lava Cake', category: 'Dessert', emoji: '🍫', time: '30 min',
      ingredients: ['200g dark chocolate', '100g butter', '2 eggs', '2 egg yolks', '50g sugar', '30g flour'],
      steps: ['Melt chocolate and butter', 'Whisk eggs, yolks, and sugar', 'Fold chocolate into eggs, add flour', 'Bake at 220°C for 12 minutes'] },
    { id: 6, name: 'Iced Coffee', category: 'Drink', emoji: '☕', time: '5 min',
      ingredients: ['2 shots espresso', 'Ice', 'Milk', 'Sugar syrup (optional)'],
      steps: ['Brew espresso and let cool slightly', 'Fill glass with ice', 'Pour espresso over ice', 'Add milk and syrup to taste'] },
  ];

  let recipes = [];
  try { recipes = JSON.parse(localStorage.getItem('nova-recipes')) || [...SAMPLE_RECIPES]; }
  catch { recipes = [...SAMPLE_RECIPES]; }
  if (recipes.length === 0) recipes = [...SAMPLE_RECIPES];

  let activeCategory = 'All';
  let search = '';
  let viewing = null; // recipe id
  let adding = false;
  let nextId = Math.max(0, ...recipes.map(r => r.id)) + 1;

  function save() { try { localStorage.setItem('nova-recipes', JSON.stringify(recipes)); } catch {} }

  function filtered() {
    return recipes.filter(r => {
      if (activeCategory !== 'All' && r.category !== activeCategory) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }

  function render() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';

    if (viewing) { renderRecipe(viewing, accent); return; }
    if (adding) { renderAddForm(accent); return; }

    const list = filtered();
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);">
        <div style="padding:12px 16px 8px;display:flex;gap:8px;align-items:center;">
          <input type="text" placeholder="Search recipes..." value="${search}" class="recipe-search" style="
            flex:1;padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.05);color:white;font-size:13px;outline:none;">
          <button class="recipe-add-btn" style="padding:8px 14px;border-radius:10px;border:none;background:${accent};color:white;font-size:13px;cursor:pointer;white-space:nowrap;">+ Add</button>
        </div>
        <div style="display:flex;gap:4px;padding:4px 16px 8px;overflow-x:auto;flex-shrink:0;">
          ${CATEGORIES.map(c => `<button class="recipe-cat" data-cat="${c}" style="
            padding:5px 12px;border-radius:16px;border:none;font-size:11px;cursor:pointer;white-space:nowrap;
            background:${c === activeCategory ? accent : 'rgba(255,255,255,0.06)'};color:white;
          ">${c}</button>`).join('')}
        </div>
        <div style="flex:1;overflow-y:auto;padding:0 16px 16px;">
          ${list.length === 0 ? '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px;">No recipes found</div>' :
          list.map(r => `
            <div class="recipe-card" data-id="${r.id}" style="
              display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;
              background:rgba(255,255,255,0.04);margin-bottom:8px;cursor:pointer;transition:background 0.15s;
            ">
              <div style="font-size:32px;width:44px;text-align:center;flex-shrink:0;">${r.emoji || '🍽️'}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;">${r.name}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${r.category} · ${r.time || ''} · ${r.ingredients.length} ingredients</div>
              </div>
              <button class="recipe-del" data-id="${r.id}" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:16px;padding:4px;">×</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('.recipe-search').addEventListener('input', (e) => { search = e.target.value; render(); });
    container.querySelectorAll('.recipe-cat').forEach(el => el.addEventListener('click', () => { activeCategory = el.dataset.cat; render(); }));
    container.querySelectorAll('.recipe-card').forEach(el => el.addEventListener('click', (e) => {
      if (e.target.closest('.recipe-del')) return;
      viewing = +el.dataset.id; render();
    }));
    container.querySelectorAll('.recipe-del').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      recipes = recipes.filter(r => r.id !== +el.dataset.id);
      save(); render();
    }));
    container.querySelector('.recipe-add-btn').addEventListener('click', () => { adding = true; render(); });
  }

  function renderRecipe(id, accent) {
    const r = recipes.find(r => r.id === id);
    if (!r) { viewing = null; render(); return; }
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);overflow-y:auto;">
        <div style="padding:12px 16px;display:flex;align-items:center;gap:8px;">
          <button class="recipe-back" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">←</button>
          <span style="font-size:15px;font-weight:600;flex:1;">${r.emoji} ${r.name}</span>
          <span style="font-size:11px;color:rgba(255,255,255,0.4);">${r.category} · ${r.time}</span>
        </div>
        <div style="padding:0 20px 20px;">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">Ingredients</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">
            ${r.ingredients.map(i => `<span style="padding:5px 12px;border-radius:8px;background:rgba(255,255,255,0.06);font-size:12px;">${i}</span>`).join('')}
          </div>
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">Steps</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${r.steps.map((s, i) => `
              <div style="display:flex;gap:10px;align-items:flex-start;">
                <div style="width:24px;height:24px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${i+1}</div>
                <div style="font-size:13px;line-height:1.5;padding-top:2px;">${s}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelector('.recipe-back').addEventListener('click', () => { viewing = null; render(); });
  }

  function renderAddForm(accent) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);overflow-y:auto;">
        <div style="padding:12px 16px;display:flex;align-items:center;gap:8px;">
          <button class="recipe-back" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">←</button>
          <span style="font-size:15px;font-weight:600;">Add Recipe</span>
        </div>
        <div style="padding:0 20px 20px;display:flex;flex-direction:column;gap:10px;">
          <input type="text" placeholder="Recipe name" id="rf-name" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:13px;outline:none;">
          <div style="display:flex;gap:8px;">
            <input type="text" placeholder="Emoji (e.g. 🍕)" id="rf-emoji" style="width:60px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:16px;text-align:center;outline:none;">
            <input type="text" placeholder="Time (e.g. 30 min)" id="rf-time" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:13px;outline:none;">
          </div>
          <select id="rf-cat" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(30,30,60,1);color:white;font-size:13px;outline:none;">
            ${CATEGORIES.slice(1).map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <textarea placeholder="Ingredients (one per line)" id="rf-ing" rows="4" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:13px;outline:none;resize:vertical;"></textarea>
          <textarea placeholder="Steps (one per line)" id="rf-steps" rows="4" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:13px;outline:none;resize:vertical;"></textarea>
          <button id="rf-save" style="padding:10px;border-radius:10px;border:none;background:${accent};color:white;font-size:14px;font-weight:600;cursor:pointer;">Save Recipe</button>
        </div>
      </div>
    `;

    container.querySelector('.recipe-back').addEventListener('click', () => { adding = false; render(); });
    container.querySelector('#rf-save').addEventListener('click', () => {
      const name = container.querySelector('#rf-name').value.trim();
      if (!name) return;
      recipes.push({
        id: nextId++,
        name,
        emoji: container.querySelector('#rf-emoji').value.trim() || '🍽️',
        time: container.querySelector('#rf-time').value.trim() || '',
        category: container.querySelector('#rf-cat').value,
        ingredients: container.querySelector('#rf-ing').value.split('\n').map(s => s.trim()).filter(Boolean),
        steps: container.querySelector('#rf-steps').value.split('\n').map(s => s.trim()).filter(Boolean),
      });
      save();
      adding = false;
      render();
    });
  }

  render();
}
