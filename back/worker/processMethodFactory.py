from abc import ABC, abstractmethod
from typing import Any
import shade_clustering as shade_clustering
import pixel_rearrange as pixel_rearrange
import pixel_rearrange2 as pixel_rearrange2

class ProcessMethod(ABC):
    @abstractmethod
    def process(self,params:bytes) -> dict[str,Any]:

        pass

class kMeans(ProcessMethod):
    def process(self,params):
        img_rgb = shade_clustering.decode_image_bytes(params)  # bytes -> np.ndarray
        res = shade_clustering.cluster_shades_array(img_rgb)
        return res

class pixelRearrange(ProcessMethod):
    def process(self,params):
        return pixel_rearrange.process_bytes(params)


class pixelRearrange2(ProcessMethod):
    def process(self,params):
        return pixel_rearrange2.process_bytes(params)
        
#params.data['filePath]

class methodFactory:
    @staticmethod
    def create(method:str):
        if method == 'kMeans':
            return kMeans()
        if method == 'pixelRearrange':
            return pixelRearrange()
        if method == 'pixelRearrange2':
            return pixelRearrange2()
        else:
            raise ValueError("Typeof method not valid")