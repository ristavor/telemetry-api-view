import { ref, onMounted, Ref } from "vue";
import * as joint from "jointjs";
import { BaseShape, ShapeA, ShapeB, ShapeC } from "../shapes";
import { useContextMenu } from "./useContextMenu";
import { useSelection } from "./useSelection";
import { usePanningAndZooming } from "./usePanningAndZooming";

export function useCanvas(
  canvasContainer: Ref<HTMLDivElement | null>,
  canvas: Ref<HTMLDivElement | null>
) {
  let paper: joint.dia.Paper;
  let graph: joint.dia.Graph;

  const {
    contextMenuVisible,
    contextMenuPosition,
    showContextMenu,
    hideContextMenu,
  } = useContextMenu();
  const { selectedCell, selectedCellProperties, selectCell, deselectCell } =
    useSelection();

  const linkSource = ref<joint.dia.Element | null>(null);

  onMounted(() => {
    if (canvas.value && canvasContainer.value) {
      graph = new joint.dia.Graph();

      paper = new joint.dia.Paper({
        el: canvas.value,
        model: graph,
        width: canvasContainer.value.clientWidth,
        height: canvasContainer.value.clientHeight,
        gridSize: 10,
        drawGrid: true,
        background: {
          color: "rgba(0, 255, 0, 0.3)",
        },
      });

      paper.on("element:contextmenu", (elementView, evt) => {
        evt.preventDefault();
        selectCell(elementView.model); // Select the cell on right click
        showContextMenu(evt, canvasContainer.value as HTMLElement);
      });

      paper.on("element:pointerdown", (elementView, evt) => {
        if (evt.ctrlKey) {
          if (linkSource.value) {
            if (linkSource.value.id !== elementView.model.id) {
              // Prevent linking to itself
              const link = new joint.shapes.standard.Link({
                source: { id: linkSource.value.id },
                target: { id: elementView.model.id },
              });
              link.addTo(graph);
            }
            linkSource.value = null;
          } else {
            linkSource.value = elementView.model;
          }
        } else {
          selectCell(elementView.model);
        }
      });

      paper.on("link:contextmenu", (linkView, evt) => {
        evt.preventDefault();
        linkView.model.remove(); // Remove the link on right click
      });

      paper.on("blank:pointerdown", () => {
        deselectCell();
        linkSource.value = null;
      });

      const { enableZooming, enablePanning } = usePanningAndZooming(
        canvasContainer.value,
        paper
      );
      enableZooming();
      enablePanning();

      document.addEventListener("click", (event) => {
        if (
          contextMenuVisible.value &&
          !(event.target as HTMLElement).closest(".context-menu")
        ) {
          hideContextMenu();
        }
      });
    }
  });

  const addShapeToCanvas = (shapeType: string) => {
    let shape: BaseShape;
    switch (shapeType) {
      case "ShapeA":
        shape = new ShapeA();
        break;
      case "ShapeB":
        shape = new ShapeB();
        break;
      case "ShapeC":
        shape = new ShapeC();
        break;
      default:
        shape = new BaseShape();
    }
    shape.position(150, 150); // Position the shape at the center
    shape.attr("body/strokeDasharray", ""); // Set default border style to solid
    graph.addCell(shape);
  };

  const updateSelectedCell = (properties: { name: string; color: string }) => {
    if (selectedCell.value) {
      selectedCell.value.attr("label/text", properties.name);
      selectedCell.value.attr("body/fill", properties.color);
      selectedCellProperties.value = properties;
    }
  };

  const duplicateCell = () => {
    if (selectedCell.value) {
      const clone = selectedCell.value.clone();
      clone.position(
        selectedCell.value.position().x + 20,
        selectedCell.value.position().y + 20
      ); // Offset the position of the clone
      // Устанавливаем те же атрибуты для клона
      clone.attr(selectedCell.value.attributes.attrs);
      clone.attr("body/strokeDasharray", ""); // Сбрасываем границу у клона
      graph.addCell(clone);
      contextMenuVisible.value = false;
    }
  };

  const deleteCell = () => {
    if (selectedCell.value) {
      selectedCell.value.remove();
      contextMenuVisible.value = false;
      deselectCell();
    }
  };

  return {
    contextMenuVisible,
    contextMenuPosition,
    addShapeToCanvas,
    updateSelectedCell,
    duplicateCell,
    deleteCell,
    hideContextMenu,
    selectedCellProperties,
  };
}
