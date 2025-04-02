import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const TimeBasedSankeyDiagram = () => {
  const svgRef = useRef(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  useEffect(() => {
    // Toy data
    const projects = [
      { id: "project1", name: "Project A", time: new Date(2022, 0, 1), size: 50, color: "#3498db" },
      { id: "project2", name: "Project B", time: new Date(2022, 3, 1), size: 80, color: "#e74c3c" },
      { id: "project3", name: "Project C", time: new Date(2022, 7, 1), size: 60, color: "#2ecc71" },
      { id: "project4", name: "Project D", time: new Date(2022, 9, 1), size: 100, color: "#9b59b6" },
      { id: "project5", name: "Project E", time: new Date(2022, 2, 15), size: 35, color: "#f39c12" }, // Standalone project
      { id: "project6", name: "Project F", time: new Date(2022, 6, 10), size: 75, color: "#1abc9c" }, // Standalone project
      { id: "project7", name: "Project G", time: new Date(2022, 11, 5), size: 45, color: "#34495e" }  // Standalone project
    ];
    
    // Define relationships between projects with durations and phases
    // source: starting project, target: ending project, value: strength of connection, 
    // duration: length of time, phases: number of phases in the project
    const links = [
      { source: "project1", target: "project3", value: 20, duration: 7, phases: 4 }, // 4 phases
      { source: "project2", target: "project4", value: 45, duration: 6, phases: 3 }, // 3 phases
      { source: "project3", target: "project4", value: 35, duration: 2, phases: 1 }  // 1 phase
    ];
    
    // Add phases for standalone projects
    const standalonePhases = [
      { source: "project5", duration: 4, phases: 2 }, // 2 phases for Project E
      { source: "project6", duration: 5, phases: 3 }, // 3 phases for Project F
      { source: "project7", duration: 3, phases: 1 }  // 1 phase for Project G
    ];
    
    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 40, right: 100, bottom: 50, left: 50 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add a grayscale filter for non-selected projects
    const defs = svg.append("defs");
    
    defs.append("filter")
      .attr("id", "grayscale")
      .append("feColorMatrix")
      .attr("type", "matrix")
      .attr("values", "0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0");
    
    // Calculate time extent based on projects and link durations
    const startTimes = projects.map(d => d.time);
    
    // Calculate end times for each project based on links
    const endTimes = [];
    links.forEach(link => {
      const sourceProject = projects.find(p => p.id === link.source);
      // Add duration in months to the source project time
      const endTime = new Date(sourceProject.time);
      endTime.setMonth(endTime.getMonth() + link.duration);
      endTimes.push(endTime);
    });
    
    // Also add end times for standalone projects
    standalonePhases.forEach(phase => {
      const sourceProject = projects.find(p => p.id === phase.source);
      const endTime = new Date(sourceProject.time);
      endTime.setMonth(endTime.getMonth() + phase.duration);
      endTimes.push(endTime);
    });
    
    const timeExtent = d3.extent([...startTimes, ...endTimes]);
    
    // Set up scales
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(projects, d => d.size)])
      .range([height, 0]);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeMonth.every(1))
      .tickFormat(d3.timeFormat("%b %Y"));
    
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    const yAxis = d3.axisLeft(yScale);
    
    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
    
    // Add axis labels
    svg.append("text")
      .attr("transform", `translate(${width/2}, ${height + margin.bottom - 5})`)
      .style("text-anchor", "middle")
      .text("Time");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -(height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Project Size");
    
    // Calculate project positions based on time and size
    projects.forEach(project => {
      project.x = xScale(project.time);
      project.y = yScale(project.size);
    });
    
    // Helper function to calculate the end position for a link
    function getLinkEndPosition(link) {
      const sourceProject = projects.find(p => p.id === link.source);
      const targetProject = projects.find(p => p.id === link.target);
      
      // Calculate end time by adding duration to source project time
      const endTime = new Date(sourceProject.time);
      endTime.setMonth(endTime.getMonth() + link.duration);
      
      return {
        x: xScale(endTime),
        y: targetProject.y
      };
    }
    
    // Custom function to generate path for links between projects
    function generateLinkPath(d) {
      const source = projects.find(p => p.id === d.source);
      const target = projects.find(p => p.id === d.target);
      const endPos = getLinkEndPosition(d);
      
      // Calculate the thickness based on the number of phases
      const thickness = Math.max(3, d.phases * 8);
      
      // Adjust the start and end positions to connect to the vertical rectangles
      const sourceHeight = Math.sqrt(source.size) * 4;
      const targetHeight = Math.sqrt(target.size) * 4;
      const sourceY = source.y - sourceHeight/2 + (sourceHeight * (1 - (target.y / height)));
      const endY = target.y - targetHeight/2 + (targetHeight * (1 - (source.y / height)));
      
      // Control points for the curved path (Bezier curve)
      const dx = endPos.x - (source.x + 4);
      const controlPoint1X = (source.x + 4) + (dx * 0.4);
      const controlPoint1Y = sourceY;
      const controlPoint2X = (source.x + 4) + (dx * 0.6);
      const controlPoint2Y = endY;
      
      // Generate path with curved lines using Bezier curves
      return `
        M ${source.x + 4} ${sourceY - thickness/2}
        C ${controlPoint1X} ${sourceY - thickness/2}, 
          ${controlPoint2X} ${endY - thickness/2}, 
          ${endPos.x} ${endY - thickness/2}
        L ${endPos.x} ${endY + thickness/2}
        C ${controlPoint2X} ${endY + thickness/2}, 
          ${controlPoint1X} ${sourceY + thickness/2}, 
          ${source.x + 4} ${sourceY + thickness/2}
        Z
      `;
    }
    
    // Draw project nodes first (before links)
    const projectGroups = svg.selectAll(".project")
      .data(projects)
      .enter()
      .append("g")
      .attr("class", "project");
    
    projectGroups
      .append("rect")
      .attr("x", d => d.x - 4)  // Thin rectangle, 8px wide
      .attr("y", d => d.y - Math.sqrt(d.size) * 2)  // Height based on project size
      .attr("width", 8)
      .attr("height", d => Math.sqrt(d.size) * 4)
      .attr("fill", d => d.color) // Use project's color
      .attr("stroke", d => d3.color(d.color).darker(0.5)) // Darker version of the same color for stroke
      .attr("stroke-width", 2)
      .attr("class", "project-node")
      .attr("data-id", d => d.id)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        // Toggle project selection
        setSelectedProject(prevSelected => prevSelected === d.id ? null : d.id);
        
        // Prevent event bubbling
        event.stopPropagation();
      })
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 3);
          
        svg.append("text")
          .attr("class", "tooltip")
          .attr("x", d.x)
          .attr("y", d.y - Math.sqrt(d.size) * 2 - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", "#333")
          .style("font-weight", "bold")
          .text(`${d.name} (Size: ${d.size})`);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke-width", selectedProject === d.id ? 4 : 2);
          
        svg.selectAll(".tooltip").remove();
      });
    
    // Add project labels
    projectGroups
      .append("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y + Math.sqrt(d.size) * 2 + 15)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#333")
      .style("font-weight", "bold")
      .text(d => d.name);
    
    // Draw the links between projects
    const linkGroups = svg.selectAll(".link")
      .data(links)
      .enter()
      .append("g")
      .attr("class", "link");
      
    linkGroups
      .append("path")
      .attr("d", generateLinkPath)
      .attr("class", "link-path")
      .attr("data-source", d => d.source)
      .attr("data-target", d => d.target)
      .attr("fill", d => {
        const source = projects.find(p => p.id === d.source);
        return source.color;
      })
      .attr("fill-opacity", 0.9)
      .attr("stroke", d => {
        const source = projects.find(p => p.id === d.source);
        return d3.color(source.color).darker(0.5);
      })
      .attr("stroke-width", 0.5)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("fill-opacity", 1.0)
          .attr("stroke-width", 1.5);
          
        // Add tooltip with information
        const source = projects.find(p => p.id === d.source);
        const target = projects.find(p => p.id === d.target);
        const endPos = getLinkEndPosition(d);
        
        svg.append("text")
          .attr("class", "tooltip")
          .attr("x", (source.x + endPos.x) / 2)
          .attr("y", (source.y + endPos.y) / 2 - 15)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", "#333")
          .style("font-weight", "bold")
          .text(`${source.name} → ${target.name}`);
          
        svg.append("text")
          .attr("class", "tooltip")
          .attr("x", (source.x + endPos.x) / 2)
          .attr("y", (source.y + endPos.y) / 2)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", "#333")
          .text(`Phases: ${d.phases}, Duration: ${d.duration} months`);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("fill-opacity", 0.9)
          .attr("stroke-width", 0.5);
          
        svg.selectAll(".tooltip").remove();
      });
    
    // Add phase dividers manually for each link
    links.forEach(link => {
      if (link.phases > 1) {
        const source = projects.find(p => p.id === link.source);
        const target = projects.find(p => p.id === link.target);
        const endPos = getLinkEndPosition(link);
        const thickness = Math.max(3, link.phases * 8);
        
        // Calculate adjusted source position
        const sourceHeight = Math.sqrt(source.size) * 4;
        const targetHeight = Math.sqrt(target.size) * 4;
        const sourceY = source.y - sourceHeight/2 + (sourceHeight * (1 - (target.y / height)));
        const endY = target.y - targetHeight/2 + (targetHeight * (1 - (source.y / height)));
        
        // Calculate control points for the curved path
        const dx = endPos.x - (source.x + 4);
        const controlPoint1X = (source.x + 4) + (dx * 0.4);
        const controlPoint1Y = sourceY;
        const controlPoint2X = (source.x + 4) + (dx * 0.6);
        const controlPoint2Y = endY;
        
        // Draw phase dividers
        for (let i = 1; i < link.phases; i++) {
          const t = i / link.phases; // Parameter along the curve (0 to 1)
          const mt = 1 - t;
          
          // Bezier curve formula for getting point at parameter t
          const curveX = mt*mt*mt*(source.x + 4) + 3*mt*mt*t*controlPoint1X + 3*mt*t*t*controlPoint2X + t*t*t*endPos.x;
          const curveY = mt*mt*mt*sourceY + 3*mt*mt*t*controlPoint1Y + 3*mt*t*t*controlPoint2Y + t*t*t*endY;
          
          // Calculate normal to the curve at this point
          // Derivative of the Bezier curve gives the tangent direction
          const tangentX = 3*mt*mt*(controlPoint1X-(source.x+4)) + 6*mt*t*(controlPoint2X-controlPoint1X) + 3*t*t*(endPos.x-controlPoint2X);
          const tangentY = 3*mt*mt*(controlPoint1Y-sourceY) + 6*mt*t*(controlPoint2Y-controlPoint1Y) + 3*t*t*(endY-controlPoint2Y);
          
          // Normalize and rotate 90 degrees to get the normal
          const tangentLength = Math.sqrt(tangentX*tangentX + tangentY*tangentY);
          const normalX = -tangentY / tangentLength;
          const normalY = tangentX / tangentLength;
          
          // Line length based on connector thickness
          const lineLength = thickness * 1.2;
          
          // Add a line perpendicular to the curve at the phase point
          svg.append("line")
            .attr("class", "phase-divider")
            .attr("x1", curveX + normalX * lineLength/2)
            .attr("y1", curveY + normalY * lineLength/2)
            .attr("x2", curveX - normalX * lineLength/2)
            .attr("y2", curveY - normalY * lineLength/2)
            .attr("stroke", d3.color(source.color).darker(0.5))
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,2");
        }
      }
    });
    
    // Draw standalone project phases as horizontal bars
    svg.selectAll(".standalone-phase")
      .data(standalonePhases)
      .enter()
      .append("g")
      .attr("class", "standalone-phase")
      .each(function(d) {
        const source = projects.find(p => p.id === d.source);
        const sourceHeight = Math.sqrt(source.size) * 4;
        
        // Calculate end position
        const endTime = new Date(source.time);
        endTime.setMonth(endTime.getMonth() + d.duration);
        const endX = xScale(endTime);
        
        // Calculate thickness based on phases
        const thickness = Math.max(3, d.phases * 8);
        
        // Create curved phase bars for standalone projects
        // Define control points for bezier curve
        const dx = endX - (source.x + 4);
        const dy = 0; // No vertical change in this case
        const controlPoint1X = (source.x + 4) + (dx * 0.4);
        const controlPoint1Y = source.y;
        const controlPoint2X = (source.x + 4) + (dx * 0.6);
        const controlPoint2Y = source.y;

        // Draw the phase bar as a curved path instead of a rectangle
        d3.select(this)
          .append("path")
          .attr("class", "standalone-phase-path")
          .attr("data-source", d.source)
          .attr("d", `
            M ${source.x + 4} ${source.y - thickness/2}
            C ${controlPoint1X} ${source.y - thickness/2}, 
              ${controlPoint2X} ${source.y - thickness/2}, 
              ${endX} ${source.y - thickness/2}
            L ${endX} ${source.y + thickness/2}
            C ${controlPoint2X} ${source.y + thickness/2}, 
              ${controlPoint1X} ${source.y + thickness/2}, 
              ${source.x + 4} ${source.y + thickness/2}
            Z
          `)
          .attr("fill-opacity", 0.9)
          .attr("fill", source.color)
          .attr("stroke", d3.color(source.color).darker(0.5))
          .attr("stroke-width", 0.5)
          .on("mouseover", function() {
            d3.select(this)
              .attr("fill-opacity", 1.0)
              .attr("stroke-width", 1.5);
              
            svg.append("text")
              .attr("class", "tooltip")
              .attr("x", source.x + (endX - source.x) / 2)
              .attr("y", source.y - thickness/2 - 10)
              .attr("text-anchor", "middle")
              .style("font-size", "12px")
              .style("fill", "#333")
              .style("font-weight", "bold")
              .text(`${source.name} (Standalone)`);
              
            svg.append("text")
              .attr("class", "tooltip")
              .attr("x", source.x + (endX - source.x) / 2)
              .attr("y", source.y - thickness/2 + 5)
              .attr("text-anchor", "middle")
              .style("font-size", "12px")
              .style("fill", "#333")
              .text(`Phases: ${d.phases}, Duration: ${d.duration} months`);
          })
          .on("mouseout", function() {
            d3.select(this)
              .attr("fill-opacity", 0.9)
              .attr("stroke-width", 0.5);
              
            svg.selectAll(".tooltip").remove();
          });
          
        // Add phase dividers for standalone projects
        if (d.phases > 1) {
          for (let i = 1; i < d.phases; i++) {
            const ratio = i / d.phases;
            
            // Calculate points along the curve for this ratio
            const t = ratio; // Parameter along the curve (0 to 1)
            const mt = 1 - t;
            
            // Bezier curve formula for getting point at parameter t
            const curveX = mt*mt*mt*(source.x + 4) + 3*mt*mt*t*controlPoint1X + 3*mt*t*t*controlPoint2X + t*t*t*endX;
            const curveY = source.y; // Y doesn't change for standalone projects
            
            // Draw the divider perpendicular to the curve at this point
            const dividerHeight = thickness * 1.2; // Slightly taller than the path
            
            svg.append("line")
              .attr("class", "phase-divider")
              .attr("x1", curveX)
              .attr("y1", curveY - dividerHeight/2)
              .attr("x2", curveX)
              .attr("y2", curveY + dividerHeight/2)
              .attr("stroke", d3.color(source.color).darker(0.5))
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "3,2");
          }
        }
      });
    
    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 180}, 20)`);

    // Project examples in legend
    legend.append("text")
      .attr("x", 0)
      .attr("y", -5)
      .text("Projects:")
      .style("font-size", "12px")
      .style("font-weight", "bold");
      
    // Show a few project colors in the legend
    const legendProjects = projects.slice(0, Math.min(5, projects.length));
    legendProjects.forEach((project, i) => {
      legend.append("rect")
        .attr("x", i === 0 ? 0 : 5 + Math.floor(i / 3) * 50)
        .attr("y", i === 0 ? 5 : 5 + (i % 3) * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", project.color)
        .attr("stroke", d3.color(project.color).darker(0.5))
        .attr("stroke-width", 2);
        
      legend.append("text")
        .attr("x", i === 0 ? 25 : 30 + Math.floor(i / 3) * 50)
        .attr("y", i === 0 ? 17 : 17 + (i % 3) * 20)
        .text(project.name)
        .style("font-size", "12px");
    });
      
    // Phase connector example
    legend.append("text")
      .attr("x", 0)
      .attr("y", legendProjects.length * 20 + 15)
      .text("Phase Dividers:")
      .style("font-size", "12px")
      .style("font-weight", "bold");
      
    legend.append("rect")
      .attr("x", 0)
      .attr("y", legendProjects.length * 20 + 25)
      .attr("width", 50)
      .attr("height", 10)
      .attr("fill", "#3498db")
      .attr("fill-opacity", 0.7)
      .attr("stroke", d3.color("#3498db").darker(0.5));
      
    legend.append("line")
      .attr("x1", 16)
      .attr("y1", legendProjects.length * 20 + 25)
      .attr("x2", 16)
      .attr("y2", legendProjects.length * 20 + 35)
      .attr("stroke", d3.color("#3498db").darker(0.5))
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,2");
      
    legend.append("line")
      .attr("x1", 33)
      .attr("y1", legendProjects.length * 20 + 25)
      .attr("x2", 33)
      .attr("y2", legendProjects.length * 20 + 35)
      .attr("stroke", d3.color("#3498db").darker(0.5))
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,2");
      
    legend.append("text")
      .attr("x", 60)
      .attr("y", legendProjects.length * 20 + 32)
      .text("= 3 Phases")
      .style("font-size", "12px");
    
    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Project Timeline Sankey Diagram");
      
    // Add a reset selection button
    const resetButton = svg.append("g")
      .attr("class", "reset-button")
      .style("cursor", "pointer")
      .attr("transform", `translate(${width - 75}, ${height - 20})`)
      .style("opacity", 0) // Initially hidden
      .on("click", () => {
        setSelectedProject(null);
      });
      
    resetButton.append("rect")
      .attr("width", 70)
      .attr("height", 24)
      .attr("rx", 4)
      .attr("fill", "#f8f9fa")
      .attr("stroke", "#dee2e6");
      
    resetButton.append("text")
      .attr("x", 35)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Reset Selection");
  }, []);  // Empty dependency array ensures this effect runs once when component mounts
  
  // Effect for updating visual elements based on selection state
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current).select("g"); // Get the main SVG group
    if (!svg.node()) return; // Safety check
    
    // Update project nodes
    svg.selectAll(".project-node")
      .transition()
      .duration(300)
      .attr("stroke-width", function() {
        const nodeId = d3.select(this).attr("data-id");
        return nodeId === selectedProject ? 4 : 2;
      })
      .attr("filter", function() {
        const nodeId = d3.select(this).attr("data-id");
        return nodeId !== selectedProject && selectedProject !== null ? "url(#grayscale)" : null;
      });
    
    // Update links
    svg.selectAll(".link-path")
      .transition()
      .duration(300)
      .attr("opacity", function() {
        const source = d3.select(this).attr("data-source");
        const target = d3.select(this).attr("data-target");
        return source === selectedProject || target === selectedProject || selectedProject === null ? 1 : 0.2;
      })
      .attr("filter", function() {
        const source = d3.select(this).attr("data-source");
        const target = d3.select(this).attr("data-target");
        return source !== selectedProject && target !== selectedProject && selectedProject !== null ? "url(#grayscale)" : null;
      });
    
    // Update standalone phases
    svg.selectAll(".standalone-phase-path")
      .transition()
      .duration(300)
      .attr("opacity", function() {
        const source = d3.select(this).attr("data-source");
        return source === selectedProject || selectedProject === null ? 1 : 0.2;
      })
      .attr("filter", function() {
        const source = d3.select(this).attr("data-source");
        return source !== selectedProject && selectedProject !== null ? "url(#grayscale)" : null;
      });
    
    // Update reset button
    svg.select(".reset-button")
      .transition()
      .duration(300)
      .style("opacity", selectedProject ? 1 : 0);
      
  }, [selectedProject]);

  // Get project info for selected project
  const getProjectInfo = () => {
    if (!selectedProject) return null;
    
    // These would normally be derived from your actual data
    const projects = [
      { id: "project1", name: "Project A", time: new Date(2022, 0, 1), size: 50, color: "#3498db" },
      { id: "project2", name: "Project B", time: new Date(2022, 3, 1), size: 80, color: "#e74c3c" },
      { id: "project3", name: "Project C", time: new Date(2022, 7, 1), size: 60, color: "#2ecc71" },
      { id: "project4", name: "Project D", time: new Date(2022, 9, 1), size: 100, color: "#9b59b6" },
      { id: "project5", name: "Project E", time: new Date(2022, 2, 15), size: 35, color: "#f39c12" },
      { id: "project6", name: "Project F", time: new Date(2022, 6, 10), size: 75, color: "#1abc9c" },
      { id: "project7", name: "Project G", time: new Date(2022, 11, 5), size: 45, color: "#34495e" }
    ];
    
    const links = [
      { source: "project1", target: "project2", value: 30, duration: 3, phases: 2 },
      { source: "project1", target: "project3", value: 20, duration: 7, phases: 4 },
      { source: "project2", target: "project4", value: 45, duration: 6, phases: 3 },
      { source: "project3", target: "project4", value: 35, duration: 2, phases: 1 }
    ];
    
    const project = projects.find(p => p.id === selectedProject);
    if (!project) return null;
    
    const dependencies = links.filter(l => l.target === selectedProject)
      .map(l => projects.find(p => p.id === l.source)?.name).filter(Boolean);
    
    const influences = links.filter(l => l.source === selectedProject)
      .map(l => projects.find(p => p.id === l.target)?.name).filter(Boolean);
    
    return {
      name: project.name,
      size: project.size,
      dependencies,
      influences
    };
  };
  
  const projectInfo = getProjectInfo();

  return (
    <div className="w-full">
      <svg 
        ref={svgRef} 
        className="w-full"
        onClick={() => setSelectedProject(null)} // Clear selection when clicking on empty space
      ></svg>
      
      {/* Project selection information */}
      {projectInfo && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h3 className="text-lg font-bold mb-2">
            {projectInfo.name} Details
          </h3>
          <p className="text-sm text-gray-700">
            Size: {projectInfo.size}
          </p>
          <p className="text-sm text-gray-700 mt-2">
            {(() => {
              let result = '';
              if (projectInfo.dependencies.length > 0) {
                result += `Depends on: ${projectInfo.dependencies.join(', ')}`;
              }
              if (projectInfo.influences.length > 0) {
                result += `${result ? '\n' : ''}Influences: ${projectInfo.influences.join(', ')}`;
              }
              if (!result) {
                result = 'Standalone project';
              }
              return result;
            })()}
          </p>
        </div>
      )}
    </div>
  );
};

// Add usage instructions component
const Instructions = () => (
  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
    <h3 className="text-lg font-semibold mb-2">How to use this diagram:</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>Each colored bar represents a project with its phases</li>
      <li>Click on any project to highlight its connections</li>
      <li>Hover over projects or connections for more details</li>
      <li>The vertical position shows the project size</li>
      <li>The horizontal position shows time (x-axis)</li>
      <li>Click the "Reset Selection" button or anywhere on the background to clear the selection</li>
    </ul>
  </div>
);

// Main component that wraps everything together
const SankeyDiagramWithInstructions = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Project Timeline Sankey Diagram</h1>
      <Instructions />
      <TimeBasedSankeyDiagram />
    </div>
  );
};

export default SankeyDiagramWithInstructions;
