// Set up dimensions (compact but spacious enough for visibility)
const width = 1400;
const height = width;
const cx = width * 0.5;
const cy = height * 0.55;
const baseRadius = Math.min(width, height) / 2 - 160;

// Create radial tree layout function with tighter but more balanced spacing
const tree = d3.tree()
    .size([2 * Math.PI, baseRadius])
    .separation((a, b) => (a.parent === b.parent ? 2 : 4) / a.depth);

// Define Pokémon type colors
const typeColors = {
    "normal": "#A8A77A", "fire": "#EE8130", "water": "#6390F0",
    "electric": "#F7D02C", "grass": "#7AC74C", "ice": "#96D9D6",
    "fighting": "#C22E28", "poison": "#A33EA1", "ground": "#E2BF65",
    "flying": "#A98FF3", "psychic": "#F95587", "bug": "#A6B91A",
    "rock": "#B6A136", "ghost": "#735797", "dragon": "#6F35FC",
    "dark": "#705746", "steel": "#B7B7CE", "fairy": "#D685AD"
};

// Tooltip for extra info
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "5px 10px")
    .style("border-radius", "5px")
    .style("visibility", "hidden")
    .style("font-size", "12px"); // Tooltip font size reduced for clarity

// Fetch all types
fetch("https://pokeapi.co/api/v2/type")
    .then(response => response.json())
    .then(data => {
        // Filter out "stellar" and "unknown" types before processing
        const filteredTypes = data.results.filter(type =>
            type.name !== "stellar" && type.name !== "unknown"
        );

        const typeUrls = filteredTypes.map(d => d.url);
        return Promise.all(typeUrls.map(url => fetch(url).then(resp => resp.json())));
    })
    .then(typesData => {
        // Deduplicate Pokémon so each appears only once
        const seenPokemon = new Set();

        const pokemonTree = {
            name: "POKÉMON TYPES",
            children: typesData.map(typeObj => ({
                name: typeObj.name.toUpperCase(),
                children: [
                    {
                        name: "WEAKNESSES",
                        depthOffset: -90,  // Move weaknesses slightly further out
                        children: typeObj.damage_relations.double_damage_from.map(w => ({
                            name: w.name.toUpperCase(),
                            type: "weakness",
                            depthOffset: -80  // Also spread individual weakness nodes more
                        }))
                    },
                    {
                        name: "POKÉMON",
                        depthOffset: 140, // Push Pokémon further out to reduce crowding
                        children: typeObj.pokemon
                            .filter(pkmn => {
                                const name = pkmn.pokemon.name;
                                if (seenPokemon.has(name)) return false;
                                seenPokemon.add(name);
                                return true;
                            })
                            .slice(0, 15) // Limit to 15 Pokémon per type
                            .map(pkmn => ({
                                name: pkmn.pokemon.name.toUpperCase(),
                                url: pkmn.pokemon.url
                            }))
                    }
                ]
            }))
        };

        const updatedTree = d3.tree()
            .size([2 * Math.PI, baseRadius])
            .separation((a, b) => (a.parent === b.parent ? 2 : 4) / a.depth);

        const root = updatedTree(d3.hierarchy(pokemonTree)
            .sort((a, b) => d3.ascending(a.data.name, b.data.name)));

        // Apply depth offsets (if defined)
        root.descendants().forEach(d => {
            if (d.data.depthOffset) {
                d.y += d.data.depthOffset;
            }
        });

        // Create SVG container
        const svg = d3.create("svg")
            .attr("width", width)
            .attr("height", height + 150)
            .attr("viewBox", [-cx, -cy - 50, width, height + 150])
            .attr("style", "width: 100%; height: auto; font: 12px sans-serif;");

        // Append links (edges)
        svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "var(--bright-cyan-50)")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 1.5)
            .selectAll()
            .data(root.links())
            .join("path")
            .attr("d", d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y));

        // Append nodes (circles)
        const nodes = svg.append("g")
            .selectAll()
            .data(root.descendants())
            .join("circle")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
            .attr("fill", d => d.data.type === "weakness"
                ? "red"
                : typeColors[d.data.name.toLowerCase()] || "var(--turquoise)")
            .attr("r", d => d.depth === 1 ? 10 : 5) // Slightly smaller nodes for better readability
            .attr("class", "type-node")
            .on("mouseover", (event, d) => showTooltip(event, d))
            .on("mouseout", hideTooltip);

        // Append labels (text) with reduced font size
        svg.append("g")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .selectAll()
            .data(root.descendants())
            .join("text")
            .attr("transform", d => {
                const angle = d.x * 180 / Math.PI - 90;
                const x = d.y + 25;  // Move labels slightly closer in
                return `rotate(${angle}) translate(${x},0) rotate(${angle >= 90 ? 180 : 0})`;
            })
            .attr("dy", "0.31em")
            .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
            .attr("font-size", d => d.depth === 2 ? "14px" : "12px")  // Reduce font sizes
            .attr("fill", "var(--foreground)")
            .text(d => d.data.name);

        // Append SVG to container
        document.getElementById("tree-container").innerHTML = "";
        document.getElementById("tree-container").appendChild(svg.node());

        // Tooltip functions
        function showTooltip(event, d) {
            let content = `<strong>${d.data.name}</strong>`;
            if (d.data.url) {
                const id = d.data.url.split("/").slice(-2, -1)[0];
                content += `<br><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" width="60">`;
            }
            tooltip.html(content)
                .style("visibility", "visible")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY}px`);
        }

        function hideTooltip() {
            tooltip.style("visibility", "hidden");
        }
    })
    .catch(error => {
        console.error("Error loading Pokémon types:", error);
    });
