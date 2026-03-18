from abc import ABC, abstractmethod
from typing import Any
import shade_clustering as shade_clustering


class ProcessMethod(ABC):
    @abstractmethod
    def process(self,params:dict[str,Any]) -> dict[str,Any]:

        pass

class kMeans(ProcessMethod):
    def process(self,params):
        img_rgb = shade_clustering.decode_image_bytes(params)  # bytes -> np.ndarray
        res = shade_clustering.cluster_shades_array(img_rgb)
        return res
        
#params.data['filePath]

class methodFactory:
    @staticmethod
    def create(method:str):
        if method == 'kMeans':
            return kMeans()
        else:
            raise ValueError("Typeof method not valid")