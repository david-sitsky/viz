import sys

js_file = 'christmas-beetle/js/app.js'
with open(js_file, 'r') as f:
    content = f.read()

# Remove dayInfo and todayInfo references since they are deleted from HTML
content = content.replace("      dayInfo:          $('day-info'),", "")
content = content.replace("      todayInfo:        $('today-info'),", "")
content = content.replace("    if(this.dom.todayInfo) this.dom.todayInfo.textContent = `${counts.today.toLocaleString()} today`;\n", "")
content = content.replace("    if(this.dom.dayInfo) this.dom.dayInfo.textContent = `Day ${(this.currentDay+1).toLocaleString()} of ${metadata.totalDays.toLocaleString()}`;\n", "")

# Add preview elements to dom cache
cache_dom = "      speciesFilter:    $('species-filter'),"
new_cache_dom = "      filterPreview:    $('filter-preview'),\n      filterPreviewImg: $('filter-preview-img'),\n      speciesFilter:    $('species-filter'),"
content = content.replace(cache_dom, new_cache_dom)

# Find where img is created in _setupFilter
img_creation = '''        const img = document.createElement('img');
        img.src = sp.image;
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        row.appendChild(img);'''

img_creation_new = '''        const img = document.createElement('img');
        img.src = sp.image;
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        
        img.addEventListener('mouseenter', (e) => {
          this.dom.filterPreviewImg.src = sp.image.replace('square', 'medium');
          this.dom.filterPreview.classList.remove('hidden');
          const rect = img.getBoundingClientRect();
          this.dom.filterPreview.style.left = (rect.right + 15) + 'px';
          this.dom.filterPreview.style.top = (rect.top - 50) + 'px';
        });
        img.addEventListener('mouseleave', () => {
          this.dom.filterPreview.classList.add('hidden');
        });
        
        row.appendChild(img);'''

content = content.replace(img_creation, img_creation_new)

with open(js_file, 'w') as f:
    f.write(content)
